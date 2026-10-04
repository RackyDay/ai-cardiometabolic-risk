// Sends a transformed risk-input payload (see riskInputTransform.js) to the
// backend and resolves with { risk_score }. Throws on non-2xx responses so
// callers (the input ViewModel) can distinguish a failed prediction from a
// successful one instead of getting a FastAPI error body back as if it were
// a score.

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// FastAPI validation errors (422) come back as { detail: [{ loc, msg, ... }] }
// - one entry per invalid field. Turn that into a single plain-English line
// (e.g. "Password: String should have at least 8 characters") instead of
// dumping the raw JSON at the user.
const formatValidationErrors = (detail) =>
  detail
    .map((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : "value";
      const label = String(field).charAt(0).toUpperCase() + String(field).slice(1);
      return `${label}: ${err.msg}`;
    })
    .join(" ");

// Shared error-shaping: FastAPI validation errors (422) come back as
// { detail: [...] }; auth/other errors as { detail: "..." }. Fall back to
// the status text if the body isn't JSON.
const throwForStatus = async (res, action) => {
  if (res.ok) return;
  const errorBody = await res.json().catch(() => null);

  if (Array.isArray(errorBody?.detail)) {
    throw new Error(formatValidationErrors(errorBody.detail));
  }
  throw new Error(errorBody?.detail || `${action} failed - please try again.`);
};

export const predictRisk = async (inputData, accessToken) => {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(inputData)
  });

  await throwForStatus(res, "Prediction request");
  return res.json();
};

// Updates a saved assessment's score/inputs in place (PUT .../{id}),
// unlike predictRisk's /predict which always inserts a new row.
export const editRiskCalculation = async (accessToken, calculationId, inputData) => {
  const res = await fetch(`${API_URL}/api/risk-calculations/${calculationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(inputData),
  });

  await throwForStatus(res, "Saving your changes");
  return res.json();
};

export const getLearningContent = async () => {
  const res = await fetch(`${API_URL}/learn`);
  return res.json();
};

export const saveStressResult = async (accessToken, calculationId, answers) => {
  const res = await fetch(`${API_URL}/api/risk-calculations/${calculationId}/stress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ answers }),
  });
  await throwForStatus(res, "Saving stress results");
  return res.json();
};

export const signUp = async ({ email, username, password }) => {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });

  await throwForStatus(res, "Sign up");
  return res.json();
};

export const logIn = async ({ identifier, password }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  await throwForStatus(res, "Log in");
  return res.json();
};

export const updateUsername = async ({ username, accessToken }) => {
  const res = await fetch(`${API_URL}/me/username`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ username }),
  });

  await throwForStatus(res, "Updating your username");
  return res.json();
};

export const updatePassword = async ({ currentPassword, newPassword, accessToken }) => {
  const res = await fetch(`${API_URL}/me/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  await throwForStatus(res, "Updating your password");
};

export const deleteAccount = async ({ currentPassword, accessToken }) => {
  const res = await fetch(`${API_URL}/me/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ current_password: currentPassword }),
  });

  await throwForStatus(res, "Deleting your account");
};

export const logOut = async (accessToken) => {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
};

export const getLatestPrediction = async (accessToken) => {
  const res = await fetch(`${API_URL}/predictions/latest`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await throwForStatus(res, "Loading your latest risk evaluation");
  return res.json();
};

export const getRiskCalculationHistory = async (accessToken) => {
  const res = await fetch(`${API_URL}/api/risk-calculations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await throwForStatus(res, "Loading risk calculation history");
  return res.json();
};

export const getRiskCalculation = async (accessToken, calculationId) => {
  const res = await fetch(
    `${API_URL}/api/risk-calculations/${calculationId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  await throwForStatus(res, "Loading risk calculation");
  return res.json();
};

export const deleteRiskCalculation = async (accessToken, calculationId) => {
  const res = await fetch(`${API_URL}/delete?assessment_id=${encodeURIComponent(calculationId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await throwForStatus(res, "Deleting risk calculation");
};

