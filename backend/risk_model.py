# Loads the EBM model trained by train_model.py and exposes a single
# predict_risk(RiskInputData) -> dict entry point for main.py, returning both
# the risk score and the top features behind that specific prediction.
from pathlib import Path

import joblib
import pandas as pd

from schemas import RiskInputData

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "framingham_ebm.joblib"

# Loaded once at import time (not per-request) since deserializing the model
# is comparatively expensive and the artifact is immutable at runtime.
_artifact = joblib.load(MODEL_PATH)
_model = _artifact["model"]
_imputer = _artifact["imputer"]
_feature_names = _artifact["feature_names"]  # exact column order the model was trained on

TOP_CONTRIBUTORS_COUNT = 10

# The training data only has a binary "male" column; undisclosed gender is
# passed through as a missing value so the imputer fills it with the
# population median rather than forcing a guess.
_GENDER_TO_MALE = {"M": 1, "F": 0, "O": None}


def _build_feature_row(data: RiskInputData) -> pd.DataFrame:
    """Map the API's camelCase request fields onto the model's training
    feature names (e.g. gender -> male, bpMeds -> BPMeds) and column order.
    Missing optional values are left as None/NaN for the imputer to fill.
    """
    row = {
        "male": _GENDER_TO_MALE[data.gender],
        "age": data.age,
        "education": data.education,
        "currentSmoker": int(data.currentSmoker),
        "cigsPerDay": data.cigsPerDay,
        "BPMeds": int(data.bpMeds),
        "prevalentStroke": int(data.prevalentStroke),
        "prevalentHyp": int(data.prevalentHyp),
        "diabetes": int(data.diabetes),
        "totChol": data.totChol,
        "sysBP": data.sysBP,
        "diaBP": data.diaBP,
        "BMI": data.BMI,
        "heartRate": data.heartRate,
        "glucose": data.glucose,
    }
    return pd.DataFrame([row], columns=_feature_names)


def _top_contributors(imputed_row: pd.DataFrame) -> list[dict]:
    """Rank this prediction's input features by how much they pushed the
    risk score up or down, using the EBM's local (per-prediction)
    explanation, and return the top TOP_CONTRIBUTORS_COUNT by |contribution|.

    explain_local() also scores pairwise interaction terms the EBM learned
    (e.g. "age & sysBP"); those are excluded here so the result only
    contains the model's 15 named input features, keeping it 1:1 with
    RiskInputData's fields.
    """
    explanation = _model.explain_local(imputed_row).data(0)

    contributions = [
        {"feature": name, "value": float(value), "contribution": float(score)}
        for name, value, score in zip(
            explanation["names"], explanation["values"], explanation["scores"]
        )
        if name in _feature_names
    ]

    contributions.sort(key=lambda c: abs(c["contribution"]), reverse=True)
    return contributions[:TOP_CONTRIBUTORS_COUNT]


def predict_risk(data: RiskInputData) -> dict:
    """Run one row of validated input through the trained EBM and return
    both the predicted 10-year CHD risk as a percentage (0-100), for
    display in the dashboard's risk gauge, and the top contributing
    features behind that specific prediction.
    """
    row = _build_feature_row(data)
    imputed = pd.DataFrame(_imputer.transform(row), columns=_feature_names)

    probability = _model.predict_proba(imputed)[0, 1]  # P(TenYearCHD = 1); classes_ is [0, 1]
    risk_score = round(float(probability) * 100, 1)

    return {
        "risk_score": risk_score,
        "top_contributors": _top_contributors(imputed),
    }
