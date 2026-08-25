// Sends a transformed risk-input payload (see riskInputTransform.js) to the
// backend and resolves with { risk_score }. Throws on non-2xx responses so
// callers (the input ViewModel) can distinguish a failed prediction from a
// successful one instead of getting a FastAPI error body back as if it were
// a score.

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export const predictRisk = async (inputData) => {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputData)
  });

  if (!res.ok) {
    // FastAPI validation errors (422) come back as { detail: [...] };
    // fall back to the status text if the body isn't JSON.
    const errorBody = await res.json().catch(() => null);
    const detail = errorBody?.detail ? JSON.stringify(errorBody.detail) : res.statusText;
    throw new Error(`Prediction request failed (${res.status}): ${detail}`);
  }

  return res.json();
};

export const editRisk = async (inputData) => {
  const rest = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: {"Content-Type": "application/json" },
    body: JSON.stringify(inputData)
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const detail = errorBody?.detail ? JSON.stringify(errorBody.detail) : res.statusText;
    throw new Error(`Error during updating risk inputs (${res.status}): ${detail}`);  
  }

  return res.json()
}

export const getLearningContent = async () => {
  const res = await fetch(`${API_URL}/learn`);
  return res.json();
};

