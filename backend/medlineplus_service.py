"""MedlinePlus keyword search: https://medlineplus.gov/about/developers/webservices/.

The upstream endpoint returns XML, including HTML inside content fields. Only
plain text and MedlinePlus HTTPS links cross our application's API boundary.
"""
import asyncio
from collections import OrderedDict, deque
from html.parser import HTMLParser
from time import monotonic
from urllib.parse import urlsplit
from xml.etree import ElementTree

import httpx

MEDLINEPLUS_URL = "https://wsearch.nlm.nih.gov/ws/query"
CACHE_TTL_SECONDS = 12 * 60 * 60
MAX_CACHE_ENTRIES = 256
MAX_REQUESTS_PER_MINUTE = 80  # NLM permits at most 85 per minute per IP.


class MedlinePlusError(Exception):
    def __init__(self, message, status_code=502, retry_after=None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


class _PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden_depth += 1
        if tag in {"p", "div", "br", "li", "h1", "h2", "h3"}:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden_depth = max(0, self.hidden_depth - 1)
        if tag in {"p", "div", "li", "h1", "h2", "h3"}:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden_depth:
            self.parts.append(data)


def _text(content):
    # Real responses contain escaped HTML; the documented examples also show
    # nested XML tags. Preserve both forms and spacing between paragraphs.
    markup = (content.text or "") + "".join(
        ElementTree.tostring(child, encoding="unicode") for child in content
    )
    parser = _PlainText()
    parser.feed(markup)
    parser.close()
    return " ".join("".join(parser.parts).split())


def parse_articles(xml, limit):
    invalid = "MedlinePlus returned an unreadable response. Please try again."
    if len(xml) > 2_000_000 or b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
        raise MedlinePlusError(invalid)
    try:
        root = ElementTree.fromstring(xml)
        count = int(root.findtext("count", ""))
    except (ElementTree.ParseError, ValueError, LookupError):
        raise MedlinePlusError(invalid) from None
    if root.tag != "nlmSearchResult" or root.find("error") is not None or count < 0:
        raise MedlinePlusError(invalid)
    if count == 0:
        return []

    articles = []
    seen = set()
    for document in root.findall("./list/document"):
        url = document.get("url", "").strip()
        try:
            parsed = urlsplit(url)
        except ValueError:
            continue
        if parsed.scheme != "https" or parsed.netloc.lower() not in {"medlineplus.gov", "www.medlineplus.gov"}:
            continue
        fields = {node.get("name", "").lower(): _text(node) for node in document.findall("content")}
        title = fields.get("title", "")
        if not title or url in seen:
            continue
        summary = fields.get("fullsummary") or fields.get("snippet", "")
        if len(summary) > 320:
            summary = summary[:320].rsplit(" ", 1)[0] + "…"
        seen.add(url)
        articles.append({
            "id": url,  # The service supplies no stable record ID; its URL is stable.
            "title": title,
            "summary": summary,
            "url": url,
            "source": "MedlinePlus",
        })
        if len(articles) == limit:
            break
    if not articles:
        raise MedlinePlusError(invalid)
    return articles


class MedlinePlusService:
    """Bounded cache, coalesced requests and throttling for one API worker.

    Share the limiter/cache across workers if deploying multiple workers behind
    the same public IP. This app currently runs a single Uvicorn worker.
    """
    def __init__(self, transport=None, clock=monotonic):
        self._transport = transport
        self._clock = clock
        self._cache = OrderedDict()
        self._inflight = {}
        self._request_times = deque()
        self._slots = asyncio.Semaphore(3)

    async def search(self, query, limit=3):
        query = " ".join(query.split())
        if not query:
            return []
        key = (query, limit)
        cached = self._cache.get(key)
        if cached and cached[0] > self._clock():
            self._cache.move_to_end(key)
            return cached[1]
        self._cache.pop(key, None)
        task = self._inflight.get(key)
        if task is None:
            task = asyncio.create_task(self._fetch(query, limit, key))
            self._inflight[key] = task

            def finished(completed):
                self._inflight.pop(key, None)
                # Consume exceptions even if every browser disconnected.
                if not completed.cancelled():
                    completed.exception()

            task.add_done_callback(finished)
        # One caller disconnecting must not cancel another caller's request.
        return await asyncio.shield(task)

    async def _fetch(self, query, limit, key):
        async with self._slots:
            now = self._clock()
            while self._request_times and self._request_times[0] <= now - 60:
                self._request_times.popleft()
            if len(self._request_times) >= MAX_REQUESTS_PER_MINUTE:
                raise MedlinePlusError("Article requests are busy. Please try again shortly.", 503, 60)
            self._request_times.append(now)
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(8, connect=3), transport=self._transport,
                    follow_redirects=False,
                ) as client:
                    response = await client.get(MEDLINEPLUS_URL, params={
                        "db": "healthTopics", "term": query, "retmax": limit,
                        "rettype": "brief", "tool": "SmartHeartAI",
                    })
                    response.raise_for_status()
            except httpx.TimeoutException:
                raise MedlinePlusError("MedlinePlus took too long to respond. Please try again.", 504) from None
            except httpx.HTTPError:
                raise MedlinePlusError("MedlinePlus is temporarily unavailable. Please try again.") from None

            articles = parse_articles(response.content, limit)
            self._cache[key] = (self._clock() + CACHE_TTL_SECONDS, articles)
            self._cache.move_to_end(key)
            while len(self._cache) > MAX_CACHE_ENTRIES:
                self._cache.popitem(last=False)
            return articles
