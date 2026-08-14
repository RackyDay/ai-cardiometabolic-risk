# Request body for POST /predict. Field names and bounds mirror
# frontend/src/schemas/riskInputSchema.ts so the same "shape" of data is
# validated on both sides of the API boundary.
from typing import Literal, Optional

from pydantic import BaseModel, Field


class RiskInputData(BaseModel):
    # Demographic fields
    gender: Literal["M", "F", "O"]
    age: int = Field(ge=1, le=150)
    education: Literal[1, 2, 3, 4]  # 1=some HS, 2=HS/GED, 3=some college, 4=college grad

    # Lifestyle fields
    currentSmoker: bool
    cigsPerDay: Optional[float] = Field(default=None, ge=0, le=500)  # optional: only meaningful for smokers

    # Medical history fields
    bpMeds: bool
    prevalentStroke: bool
    prevalentHyp: bool
    diabetes: bool

    # Clinical measurements — all optional since a user may not know/have these on hand
    sysBP: Optional[float] = Field(default=None, ge=70, le=300)
    diaBP: Optional[float] = Field(default=None, ge=40, le=200)
    BMI: Optional[float] = Field(default=None, ge=10, le=60)
    heartRate: Optional[float] = Field(default=None, ge=30, le=200)
    glucose: Optional[float] = Field(default=None, ge=40, le=500)
    totChol: Optional[float] = Field(default=None, ge=100, le=600)


class FeatureContribution(BaseModel):
    # One input feature's effect on a single prediction, from the EBM's
    # local (per-prediction) explanation.
    feature: str  # model feature name, e.g. "age", "male", "BPMeds"
    value: float  # the (possibly imputed) value the model used for this feature
    contribution: float  # signed effect on the risk score; further from 0 = bigger effect


class PredictionResponse(BaseModel):
    risk_score: float
    top_contributors: list[FeatureContribution]
