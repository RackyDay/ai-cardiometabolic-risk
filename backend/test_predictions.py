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
from postgrest.exceptions import APIError

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


# Exercises fetch_risk_calculation's real query shape (not monkeypatched
# away like the two tests above) - specifically that its embedded
# risk_inputs(*) select resolves correctly through to the API response.
def test_get_risk_calculation_resolves_embedded_inputs(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000005"
    tables = {
        "risk_calculations": [
            {"riskcalc_id": calculation_id, "risk_score": 42.0, "user_id": "user-1"},
        ],
        "risk_inputs": [
            {"riskcalc_id": calculation_id, "inputs_JSON": VALID_PAYLOAD},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    response = client.get(f"/api/risk-calculations/{calculation_id}",
                          headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    body = response.json()
    assert body["riskcalc_id"] == calculation_id
    assert body["risk_score"] == 42.0
    assert body["inputs"] == VALID_PAYLOAD
    assert len(body["top_contributors"]) > 0


def test_get_risk_calculation_uses_persisted_contributors_without_recomputing(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000007"
    stored_contributors = [{"feature": "age", "value": 45, "contribution": 0.2}]
    tables = {
        "risk_calculations": [
            {"riskcalc_id": calculation_id, "risk_score": 42.0, "user_id": "user-1",
             "top_contributors": stored_contributors},
        ],
        "risk_inputs": [
            {"riskcalc_id": calculation_id, "inputs_JSON": VALID_PAYLOAD},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    def predict_risk_should_not_run(data):
        raise AssertionError("predict_risk should not run when top_contributors is already stored")
    monkeypatch.setattr(main_module, "predict_risk", predict_risk_should_not_run)

    response = client.get(f"/api/risk-calculations/{calculation_id}",
                          headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json()["top_contributors"] == stored_contributors


def test_get_risk_calculation_404s_when_not_found(monkeypatch):
    _install_fake_auth(monkeypatch)
    _install_fake_scoped_client(monkeypatch, {"risk_calculations": [], "risk_inputs": []})

    response = client.get("/api/risk-calculations/00000000-0000-0000-0000-000000000006",
                          headers={"Authorization": "Bearer token"})

    assert response.status_code == 404


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
            # "*" (fetch_risk_calculation) means "all columns", same as no
            # columns at all - not a literal column named "*".
            wanted_columns = [
                c.strip() for c in columns.split(",") if c.strip() and c.strip() != "*"
            ]
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

    def rpc(self, name, params):
        # This fixture has no real Postgres function behind it, so every
        # call looks exactly like the migration not being applied yet -
        # which exercises save_assessment/update_assessment's fallback
        # path, the same one this suite already covers via .table() calls.
        raise APIError({"code": "PGRST202", "message": f"Could not find function {name}"})


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


# --- database.save_assessment/update_assessment's RPC-first writes ---
#
# FakeScopedClient.rpc() always raises "function not found", simulating a
# database the atomic-write migration hasn't reached yet - that's what
# exercises the fallback path in the tests above/below (via the FastAPI
# endpoints). These two instead fake a *working* RPC directly, to verify
# the happy path - that save_assessment/update_assessment actually call
# .rpc() and use its result, rather than always falling through to .table()
# - which a real Postgres function can't stand in for in a unit test.

class FakeRpcQuery:
    def __init__(self, result):
        self._result = result

    def execute(self):
        return SimpleNamespace(data=self._result)


class FakeScopedClientWithWorkingRpc(FakeScopedClient):
    def __init__(self, tables, rpc_result):
        super().__init__(tables)
        self._rpc_result = rpc_result
        self.rpc_calls = []

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return FakeRpcQuery(self._rpc_result)


def test_save_assessment_uses_rpc_when_available(monkeypatch):
    tables = {"risk_calculations": [], "risk_inputs": []}
    fake_client = FakeScopedClientWithWorkingRpc(tables, rpc_result="new-riskcalc-id")
    monkeypatch.setattr(database_module, "get_user_scoped_client", lambda token: fake_client)

    riskcalc_id = database_module.save_assessment(
        "user-1", 42.0, "1", VALID_PAYLOAD, [{"feature": "age"}], "token"
    )

    assert riskcalc_id == "new-riskcalc-id"
    assert fake_client.rpc_calls == [(
        "save_assessment_atomic",
        {
            "p_user_id": "user-1",
            "p_risk_score": 42.0,
            "p_model_version": "1",
            "p_inputs": VALID_PAYLOAD,
            "p_top_contributors": [{"feature": "age"}],
        },
    )]
    # The RPC path never touches .table() - both rows would otherwise be
    # inserted by the Postgres function in one round trip, not here.
    assert tables["risk_calculations"] == []
    assert tables["risk_inputs"] == []


def test_update_assessment_uses_rpc_when_available(monkeypatch):
    tables = {"risk_calculations": [], "risk_inputs": []}
    fake_client = FakeScopedClientWithWorkingRpc(tables, rpc_result=None)
    monkeypatch.setattr(database_module, "get_user_scoped_client", lambda token: fake_client)

    database_module.update_assessment("calc-1", 42.0, VALID_PAYLOAD, [{"feature": "age"}], "token")

    assert fake_client.rpc_calls == [(
        "update_assessment_atomic",
        {
            "p_riskcalc_id": "calc-1",
            "p_risk_score": 42.0,
            "p_inputs": VALID_PAYLOAD,
            "p_top_contributors": [{"feature": "age"}],
        },
    )]
    assert tables["risk_calculations"] == []
    assert tables["risk_inputs"] == []


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
    # Persisted at write time so later reads don't have to rerun the model
    # to get it back (see fetch_latest_risk_calculation/fetch_risk_calculation).
    assert tables["risk_calculations"][0]["top_contributors"] == response.json()["top_contributors"]

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
    assert tables["risk_calculations"][0]["top_contributors"] == body["top_contributors"]
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
    # No top_contributors column value on this row - simulates a row saved
    # before the 2026-10-01 migration, which must still fall back to
    # recomputing it from the stored inputs.
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


def test_latest_prediction_uses_persisted_contributors_without_recomputing(monkeypatch):
    _install_fake_auth(monkeypatch)
    stored_contributors = [{"feature": "age", "value": 45, "contribution": 0.2}]
    tables = {
        "risk_calculations": [
            {
                "riskcalc_id": "calc-1",
                "risk_score": 45.6,
                "riskcalc_timestamp": "2026-08-19T00:00:00Z",
                "top_contributors": stored_contributors,
            },
        ],
        "risk_inputs": [
            {"riskcalc_id": "calc-1", "inputs_JSON": VALID_PAYLOAD},
        ],
    }
    _install_fake_scoped_client(monkeypatch, tables)

    def predict_risk_should_not_run(data):
        raise AssertionError("predict_risk should not run when top_contributors is already stored")
    monkeypatch.setattr(main_module, "predict_risk", predict_risk_should_not_run)

    response = client.get("/predictions/latest", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json()["top_contributors"] == stored_contributors


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
