import { useResetPasswordViewModel } from "./useResetPasswordViewModel";
import "../auth/AuthPage.css";

function ResetPasswordPage() {
  const {
    status,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    error,
    success,
    handleSubmit,
  } = useResetPasswordViewModel();

  if (status === "verifying") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Verifying link...</h1>
        </section>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Link expired</h1>
          <p className="auth-description">
            This password reset link is invalid or has expired. Go back to the login page and request a new one.
          </p>
        </section>
      </main>
    );
  }

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Password updated</h1>
          <p className="auth-description">Redirecting you now...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-description">
          Enter a new password for your account.
        </p>

        <label className="auth-field">
          <span>New Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </label>

        <label className="auth-field">
          <span>Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your new password"
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}

export default ResetPasswordPage;
