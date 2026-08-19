# Tests for GET /predictions/latest. Monkeypatches auth.supabase (token
# validation) and main.get_user_scoped_client (the RLS-scoped Supabase
# client) so the suite never hits a live Supabase project - consistent with
# test_auth.py.
from types import SimpleNamespace

from fastapi.testclient import TestClient

import auth as auth_module
import main as main_module
from main import app
from test_main import VALID_PAYLOAD

client = TestClient(app)


class FakeSelectQuery:
    def __init__(self, rows):
        self._rows = list(rows)
        self._filters = {}
        self._is_maybe_single = False
        self._order_desc = False
        self._limit = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, field, value):
        self._filters[field] = value
        return self

    def order(self, column, desc=False, **kwargs):
        self._rows.sort(key=lambda r: r.get(column), reverse=desc)
        return self

    def limit(self, n):
        self._limit = n
        return self

    def maybe_single(self):
        self._is_maybe_single = True
        return self

    def execute(self):
        matches = [
            row for row in self._rows
            if all(row.get(k) == v for k, v in self._filters.items())
        ]
        if self._limit is not None:
            matches = matches[: self._limit]

        if self._is_maybe_single:
            return SimpleNamespace(data=matches[0]) if matches else None
        return SimpleNamespace(data=matches)


class FakeScopedClient:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return FakeSelectQuery(self._tables.get(name, []))


def _install_fake_auth(monkeypatch, user_id="user-1"):
    fake_auth = SimpleNamespace(
        get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id=user_id, email="user@example.com"))
    )
    monkeypatch.setattr(auth_module, "supabase", SimpleNamespace(auth=fake_auth))


def _install_fake_scoped_client(monkeypatch, tables):
    monkeypatch.setattr(main_module, "get_user_scoped_client", lambda token: FakeScopedClient(tables))


def test_latest_prediction_with_no_history(monkeypatch):
    _install_fake_auth(monkeypatch)
    _install_fake_scoped_client(monkeypatch, {"risk_calculations": [], "risk_inputs": []})

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json() == {
        "has_history": False,
        "risk_score": None,
        "top_contributors": None,
        "riskcalc_timestamp": None,
    }


def test_latest_prediction_returns_most_recent_with_recomputed_contributors(monkeypatch):
    _install_fake_auth(monkeypatch)
    tables = {
        "risk_calculations": [
            {"riskcalc_id": "calc-1", "risk_score": 12.3, "riskcalc_timestamp": "2026-08-01T00:00:00Z"},
            {"riskcalc_id": "calc-2", "risk_score": 45.6, "riskcalc_timestamp": "2026-08-19T00:00:00Z"},
        ],
        "risk_inputs": [
            {"riskcalc_id": "calc-2", "inputs_JSON": VALID_PAYLOAD},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    body = response.json()
    assert body["has_history"] is True
    # Picks calc-2 (the later timestamp), not calc-1.
    assert body["risk_score"] == 45.6
    assert body["riskcalc_timestamp"] == "2026-08-19T00:00:00Z"
    assert len(body["top_contributors"]) > 0


def test_latest_prediction_degrades_gracefully_with_no_matching_inputs_row(monkeypatch):
    _install_fake_auth(monkeypatch)
    tables = {
        "risk_calculations": [
            {"riskcalc_id": "calc-1", "risk_score": 30.0, "riskcalc_timestamp": "2026-08-19T00:00:00Z"},
        ],
        "risk_inputs": [],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    body = response.json()
    assert body["has_history"] is True
    assert body["risk_score"] == 30.0
    assert body["top_contributors"] is None
