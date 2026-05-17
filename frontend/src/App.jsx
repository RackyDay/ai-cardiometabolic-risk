import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import InputPage from "./pages/inputs/InputPage";
import DashboardPage from "./pages/dashboard";
import LearnPage from "./pages/learn";
import { RiskProvider } from "./pages/RiskContext";
import MenuBar from "./components/MenuBar";
import SideNav from "./components/SideNav";
import useAppLayoutViewModel from "./viewmodels/useAppLayoutViewModel";

function AppLayout() {
  const { shouldShowSideNav } = useAppLayoutViewModel();

  return (
    <div className="app-layout">
      <MenuBar />

      <div className={shouldShowSideNav ? "app-body with-sidebar" : "app-body no-sidebar"}>
        {shouldShowSideNav && <SideNav />}

        <main className="app-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inputs" element={<InputPage />} />
            <Route path="/learn" element={<LearnPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RiskProvider>
        <AppLayout />
      </RiskProvider>
    </BrowserRouter>
  );
}

export default App;