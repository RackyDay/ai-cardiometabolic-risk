# Request body for POST /predict. Field names and bounds mirror
# frontend/src/schemas/riskInputSchema.ts so the same "shape" of data is
# validated on both sides of the API boundary.
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


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

    @model_validator(mode="after")
    def normalise_smoking_inputs(self):
        if self.currentSmoker is False:
            self.cigsPerDay = 0

        return self


class FeatureContribution(BaseModel):
    # One input feature's effect on a single prediction, from the EBM's
    # local (per-prediction) explanation.
    feature: str  # model feature name, e.g. "age", "male", "BPMeds"
    value: float  # the (possibly imputed) value the model used for this feature
    contribution: float  # signed effect on the risk score; further from 0 = bigger effect


class PredictionResponse(BaseModel):
    risk_score: float
    top_contributors: list[FeatureContribution]
    # Only present when the request was authenticated (anonymous
    # predictions aren't persisted, so there's no row to point to) - lets
    # the frontend edit this exact assessment in place later.
    riskcalc_id: Optional[str] = None


class SignUpRequest(BaseModel):
    email: EmailStr
    # Restricted charset (no spaces/punctuation) so a username can never be
    # confused with an email at login time - auth.py's _resolve_login_email
    # decides which one it's looking at purely by checking for "@".
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    # Supabase Auth enforces its own minimum too; this just fails fast with
    # a field-level error instead of a round trip to Supabase for it.
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    # Either an email or a username - resolved to an email server-side.
    identifier: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UpdateUsernameRequest(BaseModel):
    # Same charset/length rules as SignUpRequest.username - a username has to
    # stay email-distinguishable (no "@") and unique no matter which endpoint
    # sets it.
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")


class UpdatePasswordRequest(BaseModel):
    # current_password is re-verified server-side before the change goes
    # through, so a walked-away session can't have its password swapped.
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class DeleteAccountRequest(BaseModel):
    # Same re-verification gate as a password change - account deletion is
    # irreversible, so a logged-in session alone isn't enough to trigger it.
    current_password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str  # Supabase auth.users UUID, as a string
    email: str
    # None is possible (not just a defensive default): a profiles row whose
    # username lookup failed or predates this feature would have no value
    # here - the frontend already falls back to email for display in that case.
    username: Optional[str] = None


class AuthResponse(BaseModel):
    # access_token/refresh_token are None when Supabase requires email
    # confirmation before a session is issued - the frontend should show a
    # "check your email" state in that case instead of treating this as an
    # error.
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[UserOut] = None
    email_confirmation_required: bool = False


class LearningArticle(BaseModel):
    id: str
    title: str
    summary: str
    url: str
    source: Literal["MedlinePlus"]


class LearningContentResponse(BaseModel):
    query: str
    articles: list[LearningArticle]


class LatestPredictionResponse(BaseModel):
    has_history: bool
    riskcalc_id: Optional[str] = None
    risk_score: Optional[float] = None
    # Not persisted in risk_calculations - recomputed from the stored
    # risk_inputs row via predict_risk() (deterministic, so this matches
    # what was shown at submission time).
    top_contributors: Optional[list[FeatureContribution]] = None
    riskcalc_timestamp: Optional[str] = None
    # The stored form inputs behind this prediction, so the dashboard's
    # what-if sliders can default to the user's actual saved values
    # instead of each slider's minimum.
    inputs: Optional[dict] = None
