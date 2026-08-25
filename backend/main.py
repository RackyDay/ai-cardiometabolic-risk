from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from risk_model import predict_risk
from schemas import PredictionResponse, RiskInputData

from auth import get_current_user, get_optional_user
from uuid import UUID
import database as db

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

@app.post("/predict", response_model=PredictionResponse)
def predict(data: RiskInputData, auth = Depends(get_optional_user)):
    # data is already validated/coerced against RiskInputData's field
    # constraints by FastAPI before this line runs. response_model in turn
    # validates/serializes predict_risk()'s return value on the way out.
    result = predict_risk(data)

    if auth is not None:
        user, token = auth
        riskcalc_id = db.save_assessment(user.id, result["risk_score"], "1", data.model_dump(), token)

    #add in riskcalc_id
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

    predict(data, auth)

@app.get("/api/risk-calculations")
async def get_risk_calculations(auth = Depends(get_optional_user)):
    if auth is not None:
        _, token = auth
        risk_calculations = db.fetch_risk_calculations(token)

@app.get("/api/risk-calculations/{calculation_id}")
async def get_risk_calculation(calculation_id: UUID, auth = Depends(get_optional_user)):
    if auth is not None:
        _, token = auth
        risk_calc, risk_inputs = db.fetch_risk_calculation(calculation_id, token)

@app.get("/learn")
def learn():
    pass

@app.get("/")
def root():
    return {"message": "API running"}

@app.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
    }

