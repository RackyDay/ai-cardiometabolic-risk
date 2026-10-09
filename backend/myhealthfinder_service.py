"""MyHealthfinder prevention recommendations:
https://odphp.health.gov/our-work/national-health-initiatives/health-literacy/consumer-health-content/free-web-content/apis-developers

The v4 API returns JSON with HTML inside section content. Only plain text and
health.gov HTTPS links cross our application's API boundary. Age, sex and
tobacco use are forwarded only for the personalised endpoint and never logged.
"""
import asyncio
from collections import OrderedDict, deque
from time import monotonic
from urllib.parse import urlsplit

import httpx

# Reuse MedlinePlus' HTML-to-text parser so both sources are cleaned the same way.
from medlineplus_service import _PlainText

MYHEALTHFINDER_URL = "https://odphp.health.gov/myhealthfinder/api/v4"
ALLOWED_HOSTS = {"health.gov", "www.health.gov", "odphp.health.gov"}
CACHE_TTL_SECONDS = 12 * 60 * 60
MAX_CACHE_ENTRIES = 256
MAX_REQUESTS_PER_MINUTE = 60  # No published limit; stay well-behaved.
MAX_RECOMMENDATIONS = 6


class MyHealthfinderError(Exception):
    def __init__(self, message, status_code=502, retry_after=None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


def _text(value):
    if not isinstance(value, str):
        return ""
    parser = _PlainText()
    parser.feed(value)
    parser.close()
    return " ".join("".join(parser.parts).split())


def _as_list(value):
    if isinstance(value, list):
        return value
    return [value] if isinstance(value, dict) else []


def _summary(resource):
    sections = resource.get("Sections")
    if isinstance(sections, dict):
        sections = sections.get("section") or sections.get("Section")
    for section in _as_list(sections):
        summary = _text(section.get("Content")) or _text(section.get("Description"))
        if summary:
            if len(summary) > 320:
                summary = summary[:320].rsplit(" ", 1)[0] + "…"
            return summary
    return ""


def parse_recommendations(data):
    invalid = MyHealthfinderError("MyHealthfinder returned an unreadable response. Please try again.")
    result = data.get("Result") if isinstance(data, dict) else None
    if not isinstance(result, dict) or str(result.get("Error", "False")).lower() == "true":
        raise invalid
    resources = result.get("Resources")
    if resources in (None, "", []):
        return []
    if not isinstance(resources, dict):
        raise invalid
    # Topic search lists Resources.Resource; personalised results nest under All.
    if isinstance(resources.get("All"), dict):
        resources = resources["All"]
    items = _as_list(resources.get("Resource"))
    if not items:
        return []

    recommendations = []
    seen = set()
    for item in items:
        url = item.get("AccessibleVersion")
        title = _text(item.get("Title"))
        resource_id = str(item.get("Id", "")).strip()
        if not isinstance(url, str) or not title or not resource_id or resource_id in seen:
            continue
        try:
            parsed = urlsplit(url.strip())
        except ValueError:
            continue
        if parsed.scheme != "https" or parsed.netloc.lower() not in ALLOWED_HOSTS:
            continue
        seen.add(resource_id)
        recommendations.append({
            "id": resource_id,
            "title": title,
            "summary": _summary(item),
            "url": url.strip(),
            "source": "MyHealthfinder",
        })
    if not recommendations:
        raise invalid
    return recommendations


class MyHealthfinderService:
    """Bounded cache, coalesced requests and throttling for one API worker."""
    def __init__(self, transport=None, clock=monotonic):
        self._transport = transport
        self._clock = clock
        self._cache = OrderedDict()
        self._inflight = {}
        self._request_times = deque()
        self._slots = asyncio.Semaphore(3)

    async def recommend(self, topic_ids, age=None, sex=None, tobacco_use=None):
        """Topic matches first, in the order requested, then personalised
        age/sex recommendations (only when both are given), up to six."""
        requests = [self._get("topicsearch.json", (("TopicId", str(topic_id)),)) for topic_id in topic_ids]
        if age is not None and sex is not None:
            params = (("age", str(age)), ("sex", sex))
            if tobacco_use is not None:
                params += (("tobaccoUse", "yes" if tobacco_use else "no"),)
            requests.append(self._get("myhealthfinder.json", params))
        if not requests:
            return []
        results = await asyncio.gather(*requests, return_exceptions=True)
        if all(isinstance(result, Exception) for result in results):
            error = results[0]
            raise error if isinstance(error, MyHealthfinderError) else MyHealthfinderError(
                "MyHealthfinder is temporarily unavailable. Please try again.")

        recommendations = []
        seen = set()
        for index, result in enumerate(results):
            if isinstance(result, Exception):
                continue  # One unavailable topic shouldn't hide the others.
            topic_id = topic_ids[index] if index < len(topic_ids) else None
            # A topic search returns that topic; personalised results are general.
            for item in result[:1] if topic_id is not None else result:
                if item["id"] in seen:
                    continue
                seen.add(item["id"])
                recommendations.append({**item, "topic_id": topic_id})
        return recommendations[:MAX_RECOMMENDATIONS]

    async def _get(self, endpoint, params):
        key = (endpoint, params)
        cached = self._cache.get(key)
        if cached and cached[0] > self._clock():
            self._cache.move_to_end(key)
            return cached[1]
        self._cache.pop(key, None)
        task = self._inflight.get(key)
        if task is None:
            task = asyncio.create_task(self._fetch(endpoint, params, key))
            self._inflight[key] = task

            def finished(completed):
                self._inflight.pop(key, None)
                if not completed.cancelled():
                    completed.exception()

            task.add_done_callback(finished)
        return await asyncio.shield(task)

    async def _fetch(self, endpoint, params, key):
        async with self._slots:
            now = self._clock()
            while self._request_times and self._request_times[0] <= now - 60:
                self._request_times.popleft()
            if len(self._request_times) >= MAX_REQUESTS_PER_MINUTE:
                raise MyHealthfinderError("Recommendation requests are busy. Please try again shortly.", 503, 60)
            self._request_times.append(now)
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(8, connect=3), transport=self._transport,
                    follow_redirects=False,
                ) as client:
                    response = await client.get(f"{MYHEALTHFINDER_URL}/{endpoint}", params=dict(params, lang="en"))
                    response.raise_for_status()
                    data = response.json()
            except httpx.TimeoutException:
                raise MyHealthfinderError("MyHealthfinder took too long to respond. Please try again.", 504) from None
            except (httpx.HTTPError, ValueError):
                raise MyHealthfinderError("MyHealthfinder is temporarily unavailable. Please try again.") from None

            recommendations = parse_recommendations(data)
            self._cache[key] = (self._clock() + CACHE_TTL_SECONDS, recommendations)
            self._cache.move_to_end(key)
            while len(self._cache) > MAX_CACHE_ENTRIES:
                self._cache.popitem(last=False)
            return recommendations
