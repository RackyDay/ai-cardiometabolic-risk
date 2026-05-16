import { BrowserRouter, Routes, Route } from "react-router-dom";
import MenuBar from "./components/MenuBar";
import InputPage from "./pages/inputs";
import DashboardPage from "./pages/dashboard";
import LearnPage from "./pages/learn";
import { RiskProvider } from "./pages/RiskContext";

function App() {
  return (
    <BrowserRouter>
      <RiskProvider>
        <div className="app-shell">
          <MenuBar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<InputPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/learn" element={<LearnPage />} />
            </Routes>
          </main>
        </div>
      </RiskProvider>
    </BrowserRouter>
  );
}

export default App;