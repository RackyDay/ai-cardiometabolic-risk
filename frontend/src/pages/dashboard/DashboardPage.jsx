import { useContext } from "react";
import { RiskContext } from "../../context/RiskContext";

function DashboardPage() {

  const {riskInputs, riskScore, setRiskScore} = useContext(RiskContext)

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Risk Score: {riskScore}</p>
    </div>
  );
}

export default DashboardPage;