import asyncio

import httpx
import pytest

import myhealthfinder_service as module
from myhealthfinder_service import MyHealthfinderError, MyHealthfinderService, parse_recommendations


def resource(resource_id, title, url=None, content="<p>Plain <b>language</b> advice.</p><script>bad()</script>"):
    return {
        "Id": str(resource_id),
        "Title": title,
        "AccessibleVersion": url or f"https://odphp.health.gov/myhealthfinder/topics/{resource_id}",
        "Sections": {"section": [{"Title": "The Basics", "Content": content}]},
    }


def topic(resource_id, title, **kwargs):
    return {"Result": {"Error": "False", "Resources": {"Resource": [resource(resource_id, title, **kwargs)]}}}


def personalised(*items):
    return {"Result": {"Error": "False", "Resources": {"All": {"Resource": list(items)}}}}


def test_normalises_html_into_plain_text_and_reads_both_response_shapes():
    assert parse_recommendations(topic(533, "Get Your <i>Blood Pressure</i> Checked")) == [{
        "id": "533",
        "title": "Get Your Blood Pressure Checked",
        "summary": "Plain language advice.",
        "url": "https://odphp.health.gov/myhealthfinder/topics/533",
        "source": "MyHealthfinder",
    }]
    items = parse_recommendations(personalised(resource(25, "Keep Your Heart Healthy"), resource(25, "Duplicate")))
    assert [item["title"] for item in items] == ["Keep Your Heart Healthy"]
    single = {"Result": {"Resources": {"Resource": resource(30610, "Quit Smoking")}}}
    assert parse_recommendations(single)[0]["id"] == "30610"
    assert parse_recommendations({"Result": {"Error": "False", "Resources": {}}}) == []
    long = parse_recommendations(topic(1, "Long", content="word " * 200))[0]["summary"]
    assert len(long) <= 321 and long.endswith("…")


@pytest.mark.parametrize("data", [
    None, [], {}, {"Result": "offline"}, {"Result": {"Error": "True", "Resources": {}}},
    {"Result": {"Resources": "bad"}},
    topic(1, "Unsafe", url="javascript:alert(1)"),
    topic(1, "Lookalike", url="https://health.gov.evil.example/page"),
    topic(1, "Plain http", url="http://health.gov/page"),
])
def test_malformed_or_unsafe_responses_are_errors_not_empty_results(data):
    with pytest.raises(MyHealthfinderError):
        parse_recommendations(data)


def test_requests_topics_then_personalised_results_and_merges_them():
    requests = []
    def handler(request):
        requests.append(request)
        if request.url.path.endswith("topicsearch.json"):
            topic_id = request.url.params["TopicId"]
            return httpx.Response(200, json=topic(topic_id, f"Topic {topic_id}"))
        return httpx.Response(200, json=personalised(resource(533, "Duplicate of a topic"), resource(25, "Keep Your Heart Healthy")))

    service = MyHealthfinderService(transport=httpx.MockTransport(handler))
    results = asyncio.run(service.recommend([30610, 533], age=52, sex="male", tobacco_use=True))
    assert [(item["id"], item["topic_id"]) for item in results] == [("30610", 30610), ("533", 533), ("25", None)]
    assert str(requests[0].url).startswith("https://odphp.health.gov/myhealthfinder/api/v4/topicsearch.json?")
    personal = requests[-1].url
    assert personal.path.endswith("/myhealthfinder.json")
    assert (personal.params["age"], personal.params["sex"], personal.params["tobaccoUse"]) == ("52", "male", "yes")


def test_skips_personalised_request_without_age_and_sex_and_caps_results():
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=topic(request.url.params["TopicId"], "Topic"))

    service = MyHealthfinderService(transport=httpx.MockTransport(handler))
    results = asyncio.run(service.recommend(list(range(1, 9)), age=52, sex=None))
    assert len(results) == module.MAX_RECOMMENDATIONS
    assert all(request.url.path.endswith("topicsearch.json") for request in requests)
    assert asyncio.run(service.recommend([])) == []


def test_one_failed_topic_keeps_the_others_but_all_failing_is_an_error():
    def handler(request):
        if request.url.params.get("TopicId") == "1":
            return httpx.Response(500)
        return httpx.Response(200, json=topic(request.url.params["TopicId"], "Topic"))

    service = MyHealthfinderService(transport=httpx.MockTransport(handler))
    assert [item["id"] for item in asyncio.run(service.recommend([1, 2]))] == ["2"]
    with pytest.raises(MyHealthfinderError) as error:
        asyncio.run(service.recommend([1]))
    assert error.value.status_code == 502


def test_caches_identical_requests_then_expires_them():
    requests = []
    now = [0]
    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=topic(533, "Topic"))

    async def scenario():
        service = MyHealthfinderService(transport=httpx.MockTransport(handler), clock=lambda: now[0])
        await asyncio.gather(service.recommend([533]), service.recommend([533]))
        assert len(requests) == 1
        now[0] = module.CACHE_TTL_SECONDS + 1
        await service.recommend([533])
        assert len(requests) == 2
    asyncio.run(scenario())


@pytest.mark.parametrize("failure", ["timeout", "network", "not-json"])
def test_failures_are_translated(failure):
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("internal details", request=request)
        if failure == "network":
            raise httpx.ConnectError("internal details", request=request)
        return httpx.Response(200, content=b"<html>offline</html>")

    service = MyHealthfinderService(transport=httpx.MockTransport(handler))
    with pytest.raises(MyHealthfinderError) as error:
        asyncio.run(service.recommend([533]))
    assert error.value.status_code == (504 if failure == "timeout" else 502)
    assert "internal details" not in str(error.value)
