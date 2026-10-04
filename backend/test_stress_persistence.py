import pytest

from test_predictions import client, _install_fake_auth, _install_fake_scoped_client
from test_main import VALID_PAYLOAD
import main as main_module


def answers(values):
    return {f"pss{i + 1}": value for i, value in enumerate(values)}


@pytest.mark.parametrize("values,score", [
    ([0, 0, 0, 4, 4, 0, 4, 4, 0, 0], 0),
    ([4, 4, 4, 0, 0, 4, 0, 0, 4, 4], 40),
    ([0, 1, 2, 3, 4, 0, 1, 2, 3, 4], 16),
])
def test_authenticated_prediction_saves_server_scored_stress(monkeypatch, values, score):
    _install_fake_auth(monkeypatch)
    tables = {"risk_calculations": [], "risk_inputs": []}
    _install_fake_scoped_client(monkeypatch, tables)

    def predict(data):
        assert data.model_dump() == VALID_PAYLOAD
        return {"risk_score": 12.3, "top_contributors": []}

    monkeypatch.setattr(main_module, "predict_risk", predict)
    response = client.post("/predict", json={**VALID_PAYLOAD,
        "stress": {"answers": answers(values), "score": 999}},
        headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    saved = tables["risk_inputs"][0]
    assert saved["riskcalc_id"] == response.json()["riskcalc_id"]
    assert saved["inputs_JSON"] == VALID_PAYLOAD
    assert saved["context_JSON"] == {"stress": {
        "instrument": "PSS-10", "schema_version": 1, "answers": answers(values), "score": score,
    }}


@pytest.mark.parametrize("invalid", [None, "2", True, -1, 5, 1.5])
def test_invalid_stress_rejected_before_any_write(monkeypatch, invalid):
    _install_fake_auth(monkeypatch)
    tables = {"risk_calculations": [], "risk_inputs": []}
    _install_fake_scoped_client(monkeypatch, tables)
    response = client.post("/predict", json={**VALID_PAYLOAD, "stress": {
        "answers": {**answers([2] * 10), "pss1": invalid}}},
        headers={"Authorization": "Bearer token"})
    assert response.status_code == 422
    assert tables == {"risk_calculations": [], "risk_inputs": []}


def test_partial_stress_rejected(monkeypatch):
    _install_fake_auth(monkeypatch)
    response = client.post("/predict", json={**VALID_PAYLOAD, "stress": {"answers": {"pss1": 2}}},
                           headers={"Authorization": "Bearer token"})
    assert response.status_code == 422


def test_anonymous_stress_not_persisted(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Anonymous predictions must not save data")
    monkeypatch.setattr(main_module.db, "save_assessment", forbidden)
    response = client.post("/predict", json={**VALID_PAYLOAD, "stress": {"answers": answers([2] * 10)}})
    assert response.status_code == 200
    assert response.json()["riskcalc_id"] is None


def test_base_risk_edit_preserves_existing_context(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000001"
    context = {"stress": {"instrument": "PSS-10", "schema_version": 1,
                          "answers": answers([2] * 10), "score": 20}, "other": {"keep": True}}
    tables = {"risk_calculations": [{"riskcalc_id": calculation_id, "risk_score": 12}],
              "risk_inputs": [{"riskcalc_id": calculation_id, "inputs_JSON": VALID_PAYLOAD, "context_JSON": context}]}
    _install_fake_scoped_client(monkeypatch, tables)
    response = client.put(f"/api/risk-calculations/{calculation_id}",
                         json={**VALID_PAYLOAD, "age": 60}, headers={"Authorization": "Bearer token"})
    assert response.status_code == 200
    assert tables["risk_inputs"][0]["context_JSON"] == context


def test_stress_edit_updates_only_target_context_and_can_be_reloaded(monkeypatch):
    _install_fake_auth(monkeypatch)
    calculation_id = "00000000-0000-0000-0000-000000000001"
    tables = {"risk_calculations": [{"riskcalc_id": calculation_id, "risk_score": 12}],
              "risk_inputs": [{"riskcalc_id": calculation_id, "inputs_JSON": VALID_PAYLOAD,
                               "context_JSON": {"other": {"keep": True}}},
                              {"riskcalc_id": "other", "context_JSON": None}]}
    _install_fake_scoped_client(monkeypatch, tables)
    headers = {"Authorization": "Bearer token"}
    for values, score in [([2] * 10, 20), ([0] * 10, 16)]:
        response = client.put(f"/api/risk-calculations/{calculation_id}/stress",
                              json={"answers": answers(values)}, headers=headers)
        assert response.status_code == 200
        context = response.json()["context_JSON"]
        assert context["stress"]["score"] == score
        assert context["other"] == {"keep": True}
        fetched = client.get(f"/api/risk-calculations/{calculation_id}", headers=headers)
        assert fetched.json()["context_JSON"] == context
    assert tables["risk_inputs"][0]["inputs_JSON"] == VALID_PAYLOAD
    assert tables["risk_calculations"][0]["risk_score"] == 12
    assert tables["risk_inputs"][1]["context_JSON"] is None


def test_stress_edit_requires_auth_and_existing_owned_row(monkeypatch):
    path = "/api/risk-calculations/00000000-0000-0000-0000-000000000001/stress"
    assert client.put(path, json={"answers": answers([2] * 10)}).status_code == 401
    _install_fake_auth(monkeypatch)
    # An RLS-filtered result is indistinguishable from a missing assessment.
    _install_fake_scoped_client(monkeypatch, {"risk_calculations": [], "risk_inputs": []})
    assert client.put(path, json={"answers": answers([2] * 10)},
                      headers={"Authorization": "Bearer token"}).status_code == 404


@pytest.mark.parametrize("module", ["stress", "base"])
def test_historical_assessments_cannot_be_changed(monkeypatch, module):
    from copy import deepcopy
    _install_fake_auth(monkeypatch)
    old_id = "00000000-0000-0000-0000-000000000001"
    new_id = "00000000-0000-0000-0000-000000000002"
    tables = {"risk_calculations": [
        {"riskcalc_id": new_id, "riskcalc_timestamp": "2026-10-05", "risk_score": 12},
        {"riskcalc_id": old_id, "riskcalc_timestamp": "2026-10-01", "risk_score": 10}],
        "risk_inputs": [{"riskcalc_id": old_id, "inputs_JSON": VALID_PAYLOAD, "context_JSON": None}]}
    original = deepcopy(tables)
    _install_fake_scoped_client(monkeypatch, tables)
    path = f"/api/risk-calculations/{old_id}" + ("/stress" if module == "stress" else "")
    payload = {"answers": answers([2] * 10)} if module == "stress" else VALID_PAYLOAD
    response = client.put(path, json=payload, headers={"Authorization": "Bearer token"})
    assert response.status_code == 409
    assert tables == original
