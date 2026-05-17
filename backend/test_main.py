from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_predict():
    response = client.post("/predict", json={"age": 45, "smoker": True})
    assert response.status_code == 200
    assert "risk_score" in response.json()

def test_learn():
    response = client.get("/learn")
    assert response.status_code == 200