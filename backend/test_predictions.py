# Tests for GET /predictions/latest. Monkeypatches auth.supabase (token
# validation) and main.get_user_scoped_client (the RLS-scoped Supabase
# client) so the suite never hits a live Supabase project - consistent with
# test_auth.py.
#
# Test Case IDs (TC-39 through TC-43) map to the QA Plan's traceability
# matrix - FR17 ("store and retrieve user risk data securely") had no test
# cases at all in the original plan; this file is what closes that.
import re
from types import SimpleNamespace

from fastapi.testclient import TestClient

import auth as auth_module
import main as main_module
from main import app
from test_main import VALID_PAYLOAD
import database as database_module

client = TestClient(app)

#T69
def test_selected_calculation_returns_its_saved_score_and_inputs(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000001"
    def fetch_selected(selected_id, token):
        assert selected_id == calculation_id
        assert token == "token"
        return ([{"riskcalc_id": selected_id, "risk_score": 12.3}],
                [{"inputs_JSON": VALID_PAYLOAD}])
    monkeypatch.setattr(database_module, "fetch_risk_calculation", fetch_selected)
    monkeypatch.setattr(main_module, "predict_risk", lambda inputs: {"top_contributors": []})
    response = client.get(f"/api/risk-calculations/{calculation_id}",
                          headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert response.json() == {"riskcalc_id": calculation_id, "risk_score": 12.3,
                               "inputs": VALID_PAYLOAD, "top_contributors": []}


def test_selected_calculation_degrades_gracefully_with_stale_inputs_shape(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000002"
    # Missing several now-required fields (e.g. an older submission from
    # before they were added) - RiskInputData(**inputs) raises, so this
    # must fall back to the raw stored inputs and skip recomputing
    # top_contributors, rather than surfacing a 500.
    stale_inputs = {"age": 40, "gender": "F"}

    def fetch_selected(selected_id, token):
        return ([{"riskcalc_id": selected_id, "risk_score": 30.0}],
                [{"inputs_JSON": stale_inputs}])
    monkeypatch.setattr(database_module, "fetch_risk_calculation", fetch_selected)

    def predict_risk_should_not_run(inputs):
        raise AssertionError("predict_risk should not run for inputs that fail validation")
    monkeypatch.setattr(main_module, "predict_risk", predict_risk_should_not_run)

    response = client.get(f"/api/risk-calculations/{calculation_id}",
                          headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    body = response.json()
    assert body["risk_score"] == 30.0
    assert body["inputs"] == stale_inputs
    assert body["top_contributors"] is None


# Matches PostgREST embedded-relation select syntax, e.g.
# "riskcalc_id, risk_inputs(inputs_JSON)" -> [("risk_inputs", ["inputs_JSON"])]
_EMBED_PATTERN = re.compile(r"(\w+)\(([^)]*)\)")


class FakeSelectQuery:
    def __init__(self, rows, all_tables=None, table_name=None):
        # No copy: a reference to the same list FakeScopedClient stores in
        # self._tables[name], so an insert() here is visible to the test
        # afterward via the original `tables` dict it passed in.
        self._rows = rows
        # Needed to resolve embedded relations (e.g. risk_inputs(inputs_JSON)
        # embedded in a risk_calculations select) against their own table.
        self._all_tables = all_tables or {}
        self._table_name = table_name
        self._filters = {}
        self._is_maybe_single = False
        self._order_desc = False
        self._limit = None
        self._insert_row = None
        self._update_values = None
        self._embeds = []

    def select(self, *args, **kwargs):
        if args:
            self._embeds = _EMBED_PATTERN.findall(args[0])
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

    def insert(self, row):
        self._insert_row = row
        return self

    def update(self, values):
        self._update_values = values
        return self

    def execute(self):
        if self._insert_row is not None:
            # Mirrors the real risk_calculations/risk_inputs tables' default
            # riskcalc_id (gen_random_uuid()) when the insert doesn't supply
            # one - main.py's /predict relies on getting one back either way.
            inserted = dict(self._insert_row)
            inserted.setdefault("riskcalc_id", f"calc-{len(self._rows) + 1}")
            self._rows.append(inserted)
            return SimpleNamespace(data=[inserted])

        matches = [
            row for row in self._rows
            if all(row.get(k) == v for k, v in self._filters.items())
        ]

        if self._update_values is not None:
            for row in matches:
                row.update(self._update_values)
            return SimpleNamespace(data=matches)

        if self._limit is not None:
            matches = matches[: self._limit]

        if self._embeds:
            matches = [self._with_embeds(dict(row)) for row in matches]

        if self._is_maybe_single:
            return SimpleNamespace(data=matches[0]) if matches else None
        return SimpleNamespace(data=matches)

    def _with_embeds(self, row):
        # Only relationship any caller actually embeds today: risk_inputs
        # via its riskcalc_id foreign key back to risk_calculations.
        for embedded_table, columns in self._embeds:
            related_rows = self._all_tables.get(embedded_table, [])
            wanted_columns = [c.strip() for c in columns.split(",") if c.strip()]
            row[embedded_table] = [
                {col: r.get(col) for col in wanted_columns} if wanted_columns else dict(r)
                for r in related_rows
                if r.get("riskcalc_id") == row.get("riskcalc_id")
            ]
        return row


class FakeScopedClient:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        # setdefault (not .get(name, [])) so the list actually lives in
        # self._tables and is shared with FakeSelectQuery - required for
        # insert() to be visible back through the original `tables` dict.
        self._tables.setdefault(name, [])
        return FakeSelectQuery(self._tables[name], all_tables=self._tables, table_name=name)


def _install_fake_auth(monkeypatch, user_id="user-1"):
    fake_auth = SimpleNamespace(
        get_user=lambda token: SimpleNamespace(user=SimpleNamespace(id=user_id, email="user@example.com")),
        # get_optional_user() now calls get_claims() (local JWT
        # verification) instead of get_user() (a network round trip).
        get_claims=lambda token: {"claims": {"sub": user_id, "email": "user@example.com"}},
    )
    monkeypatch.setattr(auth_module, "supabase", SimpleNamespace(auth=fake_auth))


def _install_fake_scoped_client(monkeypatch, tables):
    # database.py holds its own `get_user_scoped_client` reference (via
    # `from supabase_client import get_user_scoped_client`) - patching
    # main's copy doesn't touch it, so every db.* call would still reach
    # the real Supabase client.
    monkeypatch.setattr(database_module, "get_user_scoped_client", lambda token: FakeScopedClient(tables))


# --- POST /predict's optional-auth persistence -----------------------

# TC-39
def test_predict_persists_to_account_when_authenticated(monkeypatch):
    _install_fake_auth(monkeypatch)
    tables = {"risk_calculations": [], "risk_inputs": []}
    _install_fake_scoped_client(monkeypatch, tables)

    response = client.post("/predict", json=VALID_PAYLOAD, headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    risk_score = response.json()["risk_score"]

    assert len(tables["risk_calculations"]) == 1
    assert tables["risk_calculations"][0]["risk_score"] == risk_score

    assert len(tables["risk_inputs"]) == 1
    persisted = tables["risk_inputs"][0]
    assert persisted["riskcalc_id"] == tables["risk_calculations"][0]["riskcalc_id"]
    assert persisted["inputs_JSON"] == VALID_PAYLOAD

    # The frontend needs this back to be able to edit the assessment in
    # place later (PUT /api/risk-calculations/{riskcalc_id}).
    assert response.json()["riskcalc_id"] == tables["risk_calculations"][0]["riskcalc_id"]


# --- PUT /api/risk-calculations/{id} - editing a saved assessment in place ---

def test_edit_risk_calculation_updates_score_and_inputs_in_place(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000003"
    tables = {
        "risk_calculations": [
            {"riskcalc_id": calculation_id, "risk_score": 12.3, "user_id": "user-1"},
        ],
        "risk_inputs": [
            {"riskinput_id": "input-1", "riskcalc_id": calculation_id, "inputs_JSON": VALID_PAYLOAD},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    updated_payload = {**VALID_PAYLOAD, "age": 60}

    response = client.put(
        f"/api/risk-calculations/{calculation_id}",
        json=updated_payload,
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["riskcalc_id"] == calculation_id

    # The existing row was updated - no new row was inserted anywhere.
    assert len(tables["risk_calculations"]) == 1
    assert len(tables["risk_inputs"]) == 1
    assert tables["risk_calculations"][0]["risk_score"] == body["risk_score"]
    assert tables["risk_inputs"][0]["inputs_JSON"] == updated_payload
    # riskinput_id (risk_inputs' own primary key) must be left alone - only
    # riskcalc_id is used to find the row to update.
    assert tables["risk_inputs"][0]["riskinput_id"] == "input-1"


def test_edit_risk_calculation_requires_auth():
    response = client.put(
        "/api/risk-calculations/00000000-0000-0000-0000-000000000004",
        json=VALID_PAYLOAD,
    )
    assert response.status_code == 401


# TC-40
def test_predict_does_not_persist_when_anonymous(monkeypatch):
    # No Authorization header at all, so get_current_user_optional short-
    # circuits to None without even calling supabase.auth.get_user - the
    # scoped client should never be reached for a logged-out submission.
    scoped_client_calls = []
    monkeypatch.setattr(
        database_module, "get_user_scoped_client", lambda token: scoped_client_calls.append(token)
    )

    response = client.post("/predict", json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert scoped_client_calls == []


# TC-41
def test_latest_prediction_with_no_history(monkeypatch):
    _install_fake_auth(monkeypatch)
    _install_fake_scoped_client(monkeypatch, {"risk_calculations": [], "risk_inputs": []})

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json() == {
        "has_history": False,
        "riskcalc_id": None,
        "risk_score": None,
        "top_contributors": None,
        "riskcalc_timestamp": None,
        "inputs": None,
    }


# TC-42
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
    assert body["riskcalc_id"] == "calc-2"
    assert body["risk_score"] == 45.6
    assert body["riskcalc_timestamp"] == "2026-08-19T00:00:00Z"
    assert len(body["top_contributors"]) > 0
    # The dashboard's what-if sliders default to these, so they must come
    # back as saved - not just used server-side to recompute the score.
    assert body["inputs"] == VALID_PAYLOAD


# TC-43
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
    assert body["inputs"] is None


def test_latest_prediction_still_returns_inputs_when_they_no_longer_match_the_current_shape(monkeypatch):
    _install_fake_auth(monkeypatch)
    # Missing required fields (e.g. an older submission from before a field
    # was added) - RiskInputData(**inputs_json) raises, so top_contributors
    # can't be recomputed, but the raw inputs are still usable for
    # defaulting whichever sliders they do cover.
    stale_inputs = {"age": 40, "gender": "F"}
    tables = {
        "risk_calculations": [
            {"riskcalc_id": "calc-1", "risk_score": 30.0, "riskcalc_timestamp": "2026-08-19T00:00:00Z"},
        ],
        "risk_inputs": [
            {"riskcalc_id": "calc-1", "inputs_JSON": stale_inputs},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    body = response.json()
    assert body["top_contributors"] is None
    assert body["inputs"] == stale_inputs
