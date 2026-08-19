import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import InputPage from "./pages/input/InputPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LearnPage from "./pages/learn/LearnPage";
import WelcomePage from "./pages/welcome/WelcomePage";
import AuthPage from "./pages/auth/AuthPage";
import SettingsPage from "./pages/settings/SettingsPage";
import { RiskProvider } from "./context/RiskContext";
import { AuthProvider } from "./context/AuthContext";
import MenuBar from "./components/layout/MenuBar/MenuBar";
import SideNav from "./components/layout/SideNav/SideNav";
import useAppLayoutViewModel from "./viewmodels/useAppLayoutViewModel";

function AppLayout() {
  const {
    shouldShowSideNav,
    isSideNavOpen,
    closeSideNav,
    toggleSideNav,
  } = useAppLayoutViewModel();

  return (
    <div className="app-layout">
      <MenuBar
        showMenuButton={shouldShowSideNav}
        onMenuClick={toggleSideNav}
      />

      <div className={shouldShowSideNav ? "app-body with-sidebar" : "app-body no-sidebar"}>
        {shouldShowSideNav && (
          <>
            <div
              className={isSideNavOpen ? "drawer-backdrop open" : "drawer-backdrop"}
              onClick={closeSideNav}
            />

            <SideNav
              isOpen={isSideNavOpen}
              onNavigate={closeSideNav}
            />
          </>
        )}

        <main className="app-content">
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/inputs" element={<InputPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RiskProvider>
          <AppLayout />
        </RiskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;