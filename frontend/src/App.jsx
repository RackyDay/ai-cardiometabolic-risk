import InputPage from "./pages/inputs";
import DashboardPage from "./pages/dashboard";
import LearnPage from "./pages/learn";
import { RiskProvider } from "./pages/RiskContext";

function App() {
  return (
    <div>
      <RiskProvider>
        <InputPage />
        <DashboardPage />
        <LearnPage />
      </RiskProvider>
    </div>
  );
}

export default App;