import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import useMenuBarViewModel from "./components/layout/MenuBar/useMenuBarViewModel";
// WelcomePage and AuthPage stay eagerly imported - they're the first thing
// a logged-out visitor sees, so they belong in the initial bundle. The rest
// (especially DashboardPage, which pulls in recharts) are lazy: nothing
// visiting "/" or "/auth" should have to download and parse the dashboard's
// charting code before it can render a login form.
import StressPage from "./pages/stress/StressPage";
import AssessmentPage from "./pages/assessment/AssessmentPage";
import WelcomePage from "./pages/welcome/WelcomePage";
import AuthPage from "./pages/auth/AuthPage";
import { RiskProvider } from "./context/RiskProvider";
import { AuthProvider } from "./context/AuthProvider";
import { UnitProvider } from "./context/UnitProvider";
import MenuBar from "./components/layout/MenuBar/MenuBar";
import SideNav from "./components/layout/SideNav/SideNav";
import useAppLayoutViewModel from "./viewmodels/useAppLayoutViewModel";

const InputPage = lazy(() => import("./pages/input/InputPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const LearnPage = lazy(() => import("./pages/learn/LearnPage"));
const AuthCallbackPage = lazy(() => import("./pages/authCallback/AuthCallbackPage"));
const ResetPasswordPage = lazy(() => import("./pages/resetPassword/ResetPasswordPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

function AppLayout() {
  const { pageTitle } = useMenuBarViewModel();
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
          {pageTitle && (
            <h1 className="mobile-page-title">
              {pageTitle}
            </h1>
          )}
  
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/assessment" element={<AssessmentPage />} />
              <Route path="/inputs" element={<InputPage />} />
              <Route path="/stress" element={<StressPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
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
          <UnitProvider>
            <AppLayout />
          </UnitProvider>
        </RiskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
