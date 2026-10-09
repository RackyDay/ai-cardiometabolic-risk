import asyncio

import httpx
import pytest

import medlineplus_service as module
from medlineplus_service import MedlinePlusError, MedlinePlusService, parse_articles

XML = b'''<nlmSearchResult><count>2</count><list>
<document url="https://medlineplus.gov/heartdiseases.html">
  <content name="title">&lt;span class="qt0"&gt;Heart&lt;/span&gt; &amp; Health</content>
  <content name="FullSummary">&lt;p&gt;First paragraph.&lt;/p&gt;&lt;p&gt;Second paragraph.&lt;/p&gt;&lt;script&gt;bad()&lt;/script&gt;</content>
</document>
<document url="https://medlineplus.gov/bloodpressure.html">
  <content name="title"><span>Blood</span> pressure</content>
  <content name="snippet">A short <span>overview</span>.</content>
</document>
</list></nlmSearchResult>'''
EMPTY = b"<nlmSearchResult><count>0</count><list /></nlmSearchResult>"


def test_normalises_escaped_and_nested_html_into_plain_text():
    articles = parse_articles(XML, 2)
    assert articles[0] == {
        "id": "https://medlineplus.gov/heartdiseases.html",
        "title": "Heart & Health",
        "summary": "First paragraph. Second paragraph.",
        "url": "https://medlineplus.gov/heartdiseases.html",
        "source": "MedlinePlus",
    }
    assert articles[1]["title"] == "Blood pressure"
    assert articles[1]["summary"] == "A short overview."
    assert len(parse_articles(XML, 1)) == 1
    assert parse_articles(EMPTY, 2) == []


@pytest.mark.parametrize("xml", [
    b"", b"<html>Service offline</html>", b"<nlmSearchResult>",
    b'<?xml version="1.0" encoding="unknown-encoding"?><nlmSearchResult><count>0</count></nlmSearchResult>',
    b"<nlmSearchResult><count>invalid</count></nlmSearchResult>",
    b"<nlmSearchResult><count>1</count><list /></nlmSearchResult>",
    b"<nlmSearchResult><count>0</count><error>Unavailable</error></nlmSearchResult>",
    b'<!DOCTYPE test [<!ENTITY test "oops">]><nlmSearchResult><count>0</count></nlmSearchResult>',
    b'<nlmSearchResult><count>1</count><list><document url="javascript:alert(1)"><content name="title">Unsafe</content></document></list></nlmSearchResult>',
    b'<nlmSearchResult><count>1</count><list><document url="https://medlineplus.gov.evil.example/test"><content name="title">Unsafe</content></document></list></nlmSearchResult>',
])
def test_malformed_or_unsafe_responses_are_errors_not_empty_results(xml):
    with pytest.raises(MedlinePlusError):
        parse_articles(xml, 2)


def test_skips_bad_records_and_deduplicates_urls():
    document = XML.split(b"<list>")[1].split(b"</list>")[0]
    xml = b'<nlmSearchResult><count>5</count><list><document url="https://example.com" />' + document + document + b"</list></nlmSearchResult>"
    assert len(parse_articles(xml, 5)) == 2


def test_encodes_queries_and_uses_the_documented_endpoint():
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(200, content=XML)

    service = MedlinePlusService(transport=httpx.MockTransport(handler))
    asyncio.run(service.search('heart & blood + "pressure"', 2))
    request = requests[0]
    assert str(request.url).startswith("https://wsearch.nlm.nih.gov/ws/query?")
    assert request.url.params["term"] == 'heart & blood + "pressure"'
    assert "%26" in str(request.url) and "%2B" in str(request.url)
    assert request.url.params["db"] == "healthTopics"
    assert request.url.params["rettype"] == "brief"
    assert request.url.params["retmax"] == "2"


def test_caches_and_coalesces_identical_searches_then_expires_them():
    requests = []
    now = [0]
    async def handler(request):
        requests.append(request)
        await asyncio.sleep(0)
        return httpx.Response(200, content=EMPTY)

    async def scenario():
        service = MedlinePlusService(transport=httpx.MockTransport(handler), clock=lambda: now[0])
        assert await asyncio.gather(service.search("heart"), service.search("heart")) == [[], []]
        assert await service.search("  heart  ") == []
        assert len(requests) == 1
        now[0] = module.CACHE_TTL_SECONDS + 1
        assert await service.search("heart") == []
        assert len(requests) == 2
        assert await service.search("  ") == []
        assert len(requests) == 2
    asyncio.run(scenario())


@pytest.mark.parametrize("failure", ["timeout", "http", "network", "malformed"])
def test_failures_are_translated_and_not_cached(failure):
    calls = []
    def handler(request):
        calls.append(request)
        if len(calls) > 1:
            return httpx.Response(200, content=EMPTY)
        if failure == "timeout":
            raise httpx.ReadTimeout("internal details", request=request)
        if failure == "network":
            raise httpx.ConnectError("internal details", request=request)
        return httpx.Response(500 if failure == "http" else 200, content=b"bad")

    async def scenario():
        service = MedlinePlusService(transport=httpx.MockTransport(handler))
        with pytest.raises(MedlinePlusError) as error:
            await service.search("heart")
        assert error.value.status_code == (504 if failure == "timeout" else 502)
        assert "internal details" not in str(error.value)
        assert await service.search("heart") == []
        assert len(calls) == 2
    asyncio.run(scenario())


def test_limits_requests_but_still_serves_cached_topics(monkeypatch):
    monkeypatch.setattr(module, "MAX_REQUESTS_PER_MINUTE", 2)
    now = [0]
    async def scenario():
        service = MedlinePlusService(
            transport=httpx.MockTransport(lambda request: httpx.Response(200, content=EMPTY)),
            clock=lambda: now[0],
        )
        await service.search("one")
        await service.search("two")
        with pytest.raises(MedlinePlusError) as error:
            await service.search("three")
        assert error.value.status_code == 503
        assert error.value.retry_after == 60
        assert await service.search("one") == []
        now[0] = 61
        assert await service.search("three") == []
    asyncio.run(scenario())
