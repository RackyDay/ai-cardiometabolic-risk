import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import InputPage from "./pages/input/InputPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LearnPage from "./pages/learn/LearnPage";
import { RiskProvider } from "./context/RiskContext";
import MenuBar from "./components/MenuBar/MenuBar";
import SideNav from "./components/SideNav/SideNav";
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
            <Route path="/" element={<InputPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
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