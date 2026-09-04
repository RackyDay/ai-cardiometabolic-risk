from fastapi.testclient import TestClient

from main import app
from risk_model import TOP_CONTRIBUTORS_COUNT, _feature_names

client = TestClient(app)

# A fully-populated, in-range payload used as the baseline for most tests;
# individual tests override just the fields they care about via dict(...).
VALID_PAYLOAD = {
    "gender": "M",
    "age": 45,
    "education": 2,
    "currentSmoker": True,
    "cigsPerDay": 10,
    "bpMeds": False,
    "prevalentStroke": False,
    "prevalentHyp": False,
    "diabetes": False,
    "sysBP": 130,
    "diaBP": 85,
    "BMI": 26.5,
    "heartRate": 75,
    "glucose": 90,
    "totChol": 210,
}


# --- Output validity -------------------------------------------------------

def test_UT_BE_001_predict_returns_valid_risk_score():
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200         # means successful response

    body = response.json()
    assert "risk_score" in body               #returnoing API response contains the risk score

    risk_score = body["risk_score"]
    assert isinstance(risk_score, float)                        #must be float
    assert 0.0 <= risk_score <= 100.0                            #must be between 0 and 100


def test_UT_BE_002_predict_is_deterministic():
    first = client.post("/predict", json=VALID_PAYLOAD).json()["risk_score"]
    second = client.post("/predict", json=VALID_PAYLOAD).json()["risk_score"]
    assert first == second


# --- Feature contributions ---------------------------------------------------

def test_UT_BE_003_predict_returns_top_contributors():
    response = client.post("/predict", json=VALID_PAYLOAD)
    body = response.json()

    assert "top_contributors" in body
    contributors = body["top_contributors"]
    assert len(contributors) == TOP_CONTRIBUTORS_COUNT

    for contributor in contributors:
        assert contributor.keys() == {"feature", "value", "contribution"}
        # Only the model's named input features should appear, never one of
        # the EBM's pairwise interaction terms (e.g. "age & sysBP").
        assert contributor["feature"] in _feature_names
        assert isinstance(contributor["value"], float)
        assert isinstance(contributor["contribution"], float)


def test_UT_BE_004_top_contributors_sorted_by_absolute_contribution_descending():
    contributors = client.post("/predict", json=VALID_PAYLOAD).json()["top_contributors"]
    magnitudes = [abs(c["contribution"]) for c in contributors]
    assert magnitudes == sorted(magnitudes, reverse=True)


# --- Optional/edge-case inputs ---------------------------------------------

def test_UT_BE_005_predict_accepts_missing_optional_fields():
    payload = {
        "gender": "F",
        "age": 30,
        "education": 1,
        "currentSmoker": False,
        "bpMeds": False,
        "prevalentStroke": False,
        "prevalentHyp": False,
        "diabetes": False,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    risk_score = response.json()["risk_score"]
    assert 0.0 <= risk_score <= 100.0


def test_UT_BE_006_predict_accepts_undisclosed_gender():
    payload = dict(VALID_PAYLOAD, gender="O")
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert 0.0 <= response.json()["risk_score"] <= 100.0


# --- Input validation (schema should reject bad data before the model sees it) --

def test_UT_BE_007_predict_rejects_missing_required_field():
    payload = dict(VALID_PAYLOAD)
    del payload["age"]
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_UT_BE_008_predict_rejects_out_of_range_value():
    payload = dict(VALID_PAYLOAD, age=999)
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_UT_BE_009_predict_rejects_invalid_gender():
    payload = dict(VALID_PAYLOAD, gender="X")
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_UT_BE_010_predict_rejects_invalid_education():
    payload = dict(VALID_PAYLOAD, education=9)
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


# --- Model behavior sanity check --------------------------------------------

def test_UT_BE_011_higher_risk_profile_scores_higher_than_lower_risk_profile():
    # Not a check on the exact score, just that the model responds in the
    # clinically expected direction to a clearly worse risk profile.
    low_risk = dict(
        VALID_PAYLOAD,
        age=25, currentSmoker=False, cigsPerDay=0, diabetes=False,
        prevalentHyp=False, sysBP=110, diaBP=70, BMI=21, glucose=80,
        totChol=170,
    )
    high_risk = dict(
        VALID_PAYLOAD,
        age=70, currentSmoker=True, cigsPerDay=30, diabetes=True,
        prevalentHyp=True, sysBP=180, diaBP=110, BMI=34, glucose=180,
        totChol=280,
    )

    low_score = client.post("/predict", json=low_risk).json()["risk_score"]
    high_score = client.post("/predict", json=high_risk).json()["risk_score"]

    assert high_score > low_score


def test_UT_BE_012_learn_returns_expected_data():
    response = client.get("/learn")
    assert response.status_code == 200
