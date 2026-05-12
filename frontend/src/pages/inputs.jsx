  import { useState } from "react";
  import { predictRisk } from "../services/api";
  import { useContext } from "react";
  import { RiskContext } from "./RiskContext";
  import "../styles/inputs.css";

  function InputPage() {
    const {riskInputs, setRiskInputs, setRiskScore} = useContext(RiskContext)

    const handleSubmit = async () => {
      const data = await predictRisk(riskInputs);
      setRiskScore(data.risk_score);
    };

    return (
      <div className="form">
        <h1>Input Page</h1>

        <div className="inputfields">
          <h2>Risk Calculation Inputs:</h2>

          <div className = "text_field">
            <label>How old are you?</label>

            <input
              type = "number"
              placeholder="Age"
              value = {riskInputs.age}
              onChange={(e) => setRiskInputs({...riskInputs, age: e.target.value})}
            />
          </div>

          <div className = "toggle_field">
            <label>Are you a smoker?</label>

            <input
              type = "checkbox"
              checked = {riskInputs.smoker}
              onChange={(e) => setRiskInputs({...riskInputs, smoker: e.target.checked})}
            />
          </div>

        </div>

        <button onClick={handleSubmit}>
          Submit
        </button>

    </div>
    );
  }

  export default InputPage;