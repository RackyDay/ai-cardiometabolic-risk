import logging

from fastapi import Depends, FastAPI, Header, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from risk_model import predict_risk
from schemas import (
    AuthResponse,
    DeleteAccountRequest,
    LatestPredictionResponse,
    LoginRequest,
    PredictionResponse,
    RiskInputData,
    SignUpRequest,
    UpdatePasswordRequest,
    UpdateUsernameRequest,
    UserOut,
)

from auth import (
    _maybe_single_data,
    delete_account,
    get_current_user_and_token,
    get_optional_user,
    log_in,
    log_out,
    sign_up,
    update_password,
    update_username,
)
from supabase_client import get_user_scoped_client, supabase_admin

logger = logging.getLogger("uvicorn.error")
from schemas import PredictionResponse, RiskInputData

from uuid import UUID
import database as db

app = FastAPI()

origins = ["https://ai-cardiometabolic-risk.onrender.com",
           "http://localhost:5173",
           "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)


# Starlette only attaches CORS headers to responses that come back through
# CORSMiddleware normally. An exception that isn't caught by a route/handler
# bypasses that and falls through to Starlette's bare 500, which has no
# Access-Control-Allow-Origin header - the browser then reports a misleading
# "blocked by CORS policy" instead of the real server error. Catching
# everything here and returning a normal JSONResponse keeps it flowing
# through CORSMiddleware, so the frontend sees the actual failure.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.post("/predict", response_model=PredictionResponse)
def predict(data: RiskInputData, auth=Depends(get_optional_user)):
    # data is already validated/coerced against RiskInputData's field
    # constraints by FastAPI before this line runs. response_model in turn
    # validates/serializes predict_risk()'s return value on the way out.
    result = predict_risk(data)

    if auth is not None:
        user, token = auth
        riskcalc_id = db.save_assessment(user.id, result["risk_score"], "1", data.model_dump(), token)

    #return riskcalc_id also if signed in
    return result

@app.post("/delete")
def delete(assessment_id, auth = Depends(get_optional_user)):
    if auth is not None:
        _, token = auth
        db.delete_assessment(assessment_id, token)

@app.post("/edit")
def edit(assessment_id, data: RiskInputData, auth = Depends(get_optional_user)):
    if auth is not None:
        _, token = auth
        db.edit_assessment(assessment_id, data.model_dump(), token)
    else:
        raise HTTPException(status_code=401, detail="Not signed in")

    predict(data, auth)

@app.get("/api/risk-calculations")
async def get_assessment_history(auth = Depends(get_optional_user)):
    if auth is not None:
        _, token = auth
        risk_calculations = db.fetch_assessment_history(token)
        return risk_calculations

@app.get("/api/risk-calculations/{calculation_id}")
def get_risk_calculation(calculation_id: UUID, auth = Depends(get_current_user_and_token)):
    _, token = auth
    risk_calc, risk_inputs = db.fetch_risk_calculation(str(calculation_id), token)
    if not risk_calc or not risk_inputs:
        raise HTTPException(status_code=404, detail="Calculation not found")
    inputs = risk_inputs[0]["inputs_JSON"]
    prediction = predict_risk(RiskInputData(**inputs))
    return {
        "riskcalc_id": risk_calc[0]["riskcalc_id"],
        "risk_score": risk_calc[0]["risk_score"],
        "inputs": inputs,
        "top_contributors": prediction.get("top_contributors", []),
    }

@app.get("/predictions/latest", response_model=LatestPredictionResponse)
def latest_prediction(auth=Depends(get_current_user_and_token)):
    """The logged-in user's most recent risk_calculations row, so the
    dashboard can show it without requiring a fresh /predict submission
    every visit. RLS (via the user-scoped client) is what actually limits
    this to the caller's own data - there's no explicit user_id filter here.
    """

    _, token = auth

    latest = db.fetch_latest_risk_calculation(token)

    if not latest:
        return LatestPredictionResponse(has_history=False)

    calculation, inputs = latest

    # top_contributors isn't persisted (only risk_score is) - recompute it
    # from the stored inputs via predict_risk(), which is deterministic
    # (see test_predict_is_deterministic), so this matches what was shown
    # at submission time.

    top_contributors = None
    if inputs and inputs.get("inputs_JSON"):
        try:
            reconstructed = RiskInputData(**inputs["inputs_JSON"])
            top_contributors = predict_risk(reconstructed)["top_contributors"]
        except Exception:
            # Stored inputs don't match the current RiskInputData shape
            # (e.g. an older submission from before a field was added) -
            # degrade gracefully and still show the score.
            top_contributors = None

    return LatestPredictionResponse(
        has_history=True,
        risk_score=calculation["risk_score"],
        top_contributors=top_contributors,
        riskcalc_timestamp=calculation["riskcalc_timestamp"],
        inputs=inputs["inputs_JSON"] if inputs and inputs.get("inputs_JSON") else None
    )

@app.get("/learn")
def learn():
    pass

@app.get("/")
def root():
    return {"message": "API running"}

@app.post("/auth/signup", response_model=AuthResponse)
def signup(req: SignUpRequest):
    """Create an account via Supabase Auth and, if email confirmation isn't
    required, log the new user straight in. See auth.sign_up for the
    username-availability/duplicate-email handling.
    """
    return sign_up(req)

@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    """Log in with either an email or a username. See
    auth._resolve_login_email for how a username gets turned into the email
    Supabase Auth actually authenticates against.
    """
    return log_in(req)

@app.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)):
    # Plain optional Header instead of the HTTPBearer dependency used
    # elsewhere: logout is best-effort revocation (log_out swallows its own
    # errors) and should never itself 401/403 on a missing or malformed
    # token - the frontend clears its local session regardless of whether
    # this call succeeds.
    if authorization and authorization.lower().startswith("bearer "):
        log_out(authorization[len("bearer "):].strip())
    return {"message": "Logged out"}

@app.get("/me")
def me(auth=Depends(get_current_user_and_token)):
    user, _ = auth
    profile = _maybe_single_data(
        supabase_admin.table("profiles").select("user_displayname").eq("user_id", user.id).maybe_single()
    )
    return {
        "id": user.id,
        "email": user.email,
        "username": profile.get("user_displayname") if profile else None,
    }


@app.patch("/me/username", response_model=UserOut)
def update_my_username(req: UpdateUsernameRequest, auth=Depends(get_current_user_and_token)):
    """Change the caller's own display name. See auth.update_username for the
    uniqueness check and the two stores it writes.
    """
    user, _ = auth
    return update_username(user, req.username)


@app.patch("/me/password")
def update_my_password(req: UpdatePasswordRequest, auth=Depends(get_current_user_and_token)):
    """Change the caller's own password after re-verifying the current one.
    See auth.update_password.
    """
    user, _ = auth
    update_password(user, req.current_password, req.new_password)
    return {"message": "Password updated"}


@app.post("/me/delete")
def delete_my_account(req: DeleteAccountRequest, auth=Depends(get_current_user_and_token)):
    """Permanently delete the caller's own account (auth.users row + profiles
    row, which cascades to their risk_calculations and risk_inputs) after
    re-verifying the current password. POST, not DELETE, to stay consistent
    with the other mutating endpoints here and to carry a JSON body cleanly.
    See auth.delete_account.
    """
    user, _ = auth
    delete_account(user, req.current_password)
    return {"message": "Account deleted"}

