export const predictRisk = async (inputData) => {
  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputData)
  });

  return res.json();
};

export const getLearningContent = async () => {
  const res = await fetch("http://localhost:8000/learn");
  return res.json();
};

