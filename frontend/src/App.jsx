import { BrowserRouter, Routes, Route } from "react-router-dom";
import InputPage from "./pages/inputs/InputPage";
import DashboardPage from "./pages/dashboard";
import LearnPage from "./pages/learn";
import { RiskProvider } from "./pages/RiskContext";

function App() {
  return (
    <BrowserRouter>
      <RiskProvider>
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
        </Routes>
      </RiskProvider>
    </BrowserRouter>
  );
}

export default App;