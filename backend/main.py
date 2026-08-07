from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from risk_model import predict_risk_score
from schemas import RiskInputData

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

@app.post("/predict")
def predict(data: RiskInputData):
    # data is already validated/coerced against RiskInputData's field
    # constraints by FastAPI before this line runs.
    return {"risk_score": predict_risk_score(data)}

@app.get("/learn")
def learn():
    pass

@app.post("/test")
def test_endpoint(data: RiskInputData):
    return {"message": f"Received age: {data.age}"}

@app.get("/")
def root():
    return {"message": "API running"}