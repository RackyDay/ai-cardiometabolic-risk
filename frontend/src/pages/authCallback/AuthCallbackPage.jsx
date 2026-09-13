import { useAuthCallbackViewModel } from "./useAuthCallbackViewModel";
import "../auth/AuthPage.css";

function AuthCallbackPage() {
  const { status, returnToLogin } = useAuthCallbackViewModel();

  if (status === "failed") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Sign-in didn't complete</h1>
          <p className="auth-description">
            We couldn't finish signing you in with Google. Head back to the login page and try again.
          </p>
          <button type="button" className="auth-submit-btn" onClick={returnToLogin}>
            Back to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-title">Finishing sign-in...</h1>
        <p className="auth-description">Hang tight, this only takes a moment.</p>
      </section>
    </main>
  );
}

export default AuthCallbackPage;
