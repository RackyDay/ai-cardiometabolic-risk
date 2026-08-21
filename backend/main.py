from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from risk_model import predict_risk
from schemas import PredictionResponse, RiskInputData

from auth import get_current_user, get_optional_user
from database import save_assessment, delete_assessment

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
        save_assessment(user.id, result["risk_score"], "1", data.model_dump(), token)

    return result



@app.post("/delete")
def delete(risk_assessment, auth = Depends(get_optional_user)):
    if auth is not None:
        user, token = auth
        delete_assessment(risk_assessment, token)
        

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