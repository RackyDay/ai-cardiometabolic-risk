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
