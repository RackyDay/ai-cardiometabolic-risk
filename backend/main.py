import logging

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from risk_model import predict_risk
from schemas import (
    AuthResponse,
    LatestPredictionResponse,
    LoginRequest,
    PredictionResponse,
    RiskInputData,
    SignUpRequest,
)

from auth import (
    _maybe_single_data,
    get_current_user,
    get_current_user_and_token,
    get_current_user_optional,
    log_in,
    log_out,
    sign_up,
)
from supabase_client import get_user_scoped_client, supabase_admin

logger = logging.getLogger("uvicorn.error")

app = FastAPI()

origins = ["https://ai-cardiometabolic-risk.onrender.com",
           "http://localhost:5173"]

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
def predict(data: RiskInputData, auth=Depends(get_current_user_optional)):
    # data is already validated/coerced against RiskInputData's field
    # constraints by FastAPI before this line runs. response_model in turn
    # validates/serializes predict_risk()'s return value on the way out.
    result = predict_risk(data)

    if auth is not None:
        # Logged in: persist this submission to the user's account. Uses a
        # client scoped to their access token (not the service-role key) so
        # the existing RLS policies (auth.uid() = user_id) enforce that a
        # user can only ever write their own rows.
        _, access_token = auth
        scoped_client = get_user_scoped_client(access_token)
        calc = (
            scoped_client.table("risk_calculations")
            .insert({"risk_score": result["risk_score"]})
            .execute()
        )
        riskcalc_id = calc.data[0]["riskcalc_id"]
        scoped_client.table("risk_inputs").insert({
            "riskcalc_id": riskcalc_id,
            "inputs_JSON": data.model_dump(),
        }).execute()

    return result

@app.get("/predictions/latest", response_model=LatestPredictionResponse)
def latest_prediction(auth=Depends(get_current_user_and_token)):
    """The logged-in user's most recent risk_calculations row, so the
    dashboard can show it without requiring a fresh /predict submission
    every visit. RLS (via the user-scoped client) is what actually limits
    this to the caller's own data - there's no explicit user_id filter here.
    """
    _, access_token = auth
    scoped_client = get_user_scoped_client(access_token)

    calc = (
        scoped_client.table("risk_calculations")
        .select("riskcalc_id, risk_score, riskcalc_timestamp")
        .order("riskcalc_timestamp", desc=True)
        .limit(1)
        .execute()
    )
    if not calc.data:
        return LatestPredictionResponse(has_history=False)

    latest = calc.data[0]

    # top_contributors isn't persisted (only risk_score is) - recompute it
    # from the stored inputs via predict_risk(), which is deterministic
    # (see test_predict_is_deterministic), so this matches what was shown
    # at submission time.
    inputs_row = _maybe_single_data(
        scoped_client.table("risk_inputs")
        .select("inputs_JSON")
        .eq("riskcalc_id", latest["riskcalc_id"])
        .maybe_single()
    )
    top_contributors = None
    if inputs_row and inputs_row.get("inputs_JSON"):
        try:
            reconstructed = RiskInputData(**inputs_row["inputs_JSON"])
            top_contributors = predict_risk(reconstructed)["top_contributors"]
        except Exception:
            # Stored inputs don't match the current RiskInputData shape
            # (e.g. an older submission from before a field was added) -
            # degrade gracefully and still show the score.
            top_contributors = None

    return LatestPredictionResponse(
        has_history=True,
        risk_score=latest["risk_score"],
        top_contributors=top_contributors,
        riskcalc_timestamp=latest["riskcalc_timestamp"],
    )

@app.get("/learn")
def learn():
    pass

@app.post("/test")
def test_endpoint(data: RiskInputData):
    return {"message": f"Received age: {data.age}"}

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
def me(user=Depends(get_current_user)):
    profile = _maybe_single_data(
        supabase_admin.table("profiles").select("username").eq("user_id", user.id).maybe_single()
    )
    return {
        "id": user.id,
        "email": user.email,
        "username": profile.get("username") if profile else None,
    }