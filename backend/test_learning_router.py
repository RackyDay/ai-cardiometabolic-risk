from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from learning_router import get_learning_service, router
from medlineplus_service import MedlinePlusError


@pytest.fixture
def api():
    # Test the same router mounted by main.py without loading ML or Supabase.
    app = FastAPI()
    app.include_router(router)
    class Service:
        error = None
        queries = []

        async def search(self, query, limit):
            self.queries.append((query, limit))
            if self.error:
                raise self.error
            return []
    service = Service()
    app.dependency_overrides[get_learning_service] = lambda: service
    with TestClient(app) as client:
        yield client, service


def test_public_search_and_blank_search_need_no_auth(api):
    client, service = api
    response = client.get("/learn", params={"query": " heart & blood ", "limit": 2})
    assert response.status_code == 200
    assert response.json() == {"query": "heart & blood", "articles": []}
    assert service.queries[-1] == ("heart & blood", 2)
    assert client.get("/learn").json() == {"query": "", "articles": []}


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 6}, {"query": "x" * 201}])
def test_rejects_invalid_search_parameters(api, params):
    client, _ = api
    assert client.get("/learn", params=params).status_code == 422


@pytest.mark.parametrize("status", [502, 503, 504])
def test_upstream_failures_have_predictable_json_errors(api, status):
    client, service = api
    service.error = MedlinePlusError("Articles unavailable.", status, 60 if status == 503 else None)
    response = client.get("/learn", params={"query": "heart"})
    assert response.status_code == status
    assert response.json() == {"detail": "Articles unavailable."}
    if status == 503:
        assert response.headers["Retry-After"] == "60"


@pytest.fixture
def prevention_api():
    from learning_router import get_prevention_service
    app = FastAPI()
    app.include_router(router)
    class Service:
        error = None
        calls = []

        async def recommend(self, topic_ids, age, sex, tobacco_use):
            self.calls.append((topic_ids, age, sex, tobacco_use))
            if self.error:
                raise self.error
            return [{
                "id": "533", "title": "Get Your Blood Pressure Checked", "summary": "Advice.",
                "url": "https://odphp.health.gov/myhealthfinder/topics/533", "source": "MyHealthfinder", "topic_id": 533,
            }]
    service = Service()
    app.dependency_overrides[get_prevention_service] = lambda: service
    with TestClient(app) as client:
        yield client, service


def test_prevention_is_public_and_passes_topics_and_demographics(prevention_api):
    client, service = prevention_api
    response = client.get("/prevention", params={"topic_ids": "533,30610", "age": 52, "sex": "male", "tobacco_use": "true"})
    assert response.status_code == 200
    assert response.json()["recommendations"][0]["topic_id"] == 533
    assert service.calls[-1] == ([533, 30610], 52, "male", True)
    assert client.get("/prevention", params={"topic_ids": "25"}).status_code == 200
    assert service.calls[-1] == ([25], None, None, None)


@pytest.mark.parametrize("params", [
    {"topic_ids": "abc"}, {"topic_ids": "1,2,3,4,5,6,7"}, {"age": 0}, {"age": 121}, {"sex": "other"},
])
def test_prevention_rejects_invalid_parameters(prevention_api, params):
    client, _ = prevention_api
    assert client.get("/prevention", params=params).status_code == 422


def test_prevention_failures_have_predictable_json_errors(prevention_api):
    from myhealthfinder_service import MyHealthfinderError
    client, service = prevention_api
    service.error = MyHealthfinderError("Recommendations unavailable.", 503, 60)
    response = client.get("/prevention", params={"topic_ids": "533"})
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "60"
    assert response.json() == {"detail": "Recommendations unavailable."}
