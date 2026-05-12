from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

class RiskInputData(BaseModel):
    age: int
    smoker: bool

@app.post("/predict")
def predict(data: RiskInputData):
    return {"risk_score": data.age + int(data.smoker)}

@app.get("/learn")
def learn():
    pass

@app.post("/test")
def test_endpoint(data: RiskInputData):
    return {"message": f"Received age: {data.age}"}

@app.get("/")
def root():
    return {"message": "API running"}