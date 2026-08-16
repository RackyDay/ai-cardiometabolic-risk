from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from risk_model import predict_risk
from schemas import PredictionResponse, RiskInputData

from auth import get_current_user

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
def predict(data: RiskInputData):
    # data is already validated/coerced against RiskInputData's field
    # constraints by FastAPI before this line runs. response_model in turn
    # validates/serializes predict_risk()'s return value on the way out.
    return predict_risk(data)

@app.get("/learn")
def learn():
    pass

@app.post("/test")
def test_endpoint(data: RiskInputData):
    return {"message": f"Received age: {data.age}"}

@app.get("/")
def root():
    return {"message": "API running"}

@app.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
    }