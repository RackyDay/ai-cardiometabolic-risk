import { useAuthViewModel } from "./useAuthViewModel";
import "./AuthPage.css";
import { Link } from "react-router-dom";

function AuthPage() {
  const {
    mode,
    toggleMode,
    email,
    setEmail,
    username,
    setUsername,
    identifier,
    setIdentifier,
    password,
    setPassword,
    isSubmitting,
    error,
    confirmationRequired,
    handleSubmit,
    handleGoogleSignIn,
    isForgotPasswordOpen,
    openForgotPassword,
    closeForgotPassword,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    forgotPasswordSubmitting,
    forgotPasswordError,
    forgotPasswordSent,
    handleForgotPasswordSubmit,
  } = useAuthViewModel();

  const isSignup = mode === "signup";

  if (confirmationRequired) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-description">
            Check your email to confirm your account, then log in.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-back">
        &lsaquo; Back to home
      </Link>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-toggle">
          <button
            type="button"
            className={!isSignup ? "auth-toggle-btn active" : "auth-toggle-btn"}
            onClick={mode === "signup" ? toggleMode : undefined}
          >
            Sign In
          </button>

          <button
            type="button"
            className={isSignup ? "auth-toggle-btn active" : "auth-toggle-btn"}
            onClick={mode !== "signup" ? toggleMode : undefined}
          >
            Sign Up
          </button>
        </div>

        <h1 className="auth-title">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>

        <p className="auth-description">
          {isSignup
            ? "Sign up to start tracking your cardiovascular health."
            : "Sign in to access your CVD assessment dashboard."}
        </p>

        {isSignup ? (
          <>
            <label className="auth-field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Jane Doe"
                required
              />
            </label>

            <label className="auth-field">
              <span>Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@example.com"
                required
              />
            </label>
          </>
        ) : (
          <label className="auth-field">
            <span>Email or Username</span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="jane@example.com"
              required
            />
          </label>
        )}

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
            required
          />
        </label>

        {!isSignup && (
          <button type="button" className="forgot-password-btn" onClick={openForgotPassword}>
            Forgot password?
          </button>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
        </button>

        {/* Same action regardless of mode - Google sign-in creates the
            account on first use and logs in on every use after, so the
            Sign In/Sign Up toggle above doesn't apply to it. */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
          Continue with Google
        </button>
      </form>

      {isForgotPasswordOpen && (
        <div className="modal-backdrop" onClick={closeForgotPassword}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close"
              onClick={closeForgotPassword}
            >
              ×
            </button>

            {forgotPasswordSent ? (
              <>
                <h2 className="auth-title">Check your email</h2>
                <p className="auth-description">
                  If an account exists for {forgotPasswordEmail}, a password reset link has been sent to it.
                </p>
              </>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <h2 className="auth-title">Reset your password</h2>
                <p className="auth-description">
                  Enter the email address on your account and we'll send you a link to reset your password.
                </p>

                <label className="auth-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(event) => setForgotPasswordEmail(event.target.value)}
                    placeholder="jane@example.com"
                    required
                  />
                </label>

                {forgotPasswordError && <p className="auth-error">{forgotPasswordError}</p>}

                <button type="submit" className="auth-submit-btn" disabled={forgotPasswordSubmitting}>
                  {forgotPasswordSubmitting ? "Sending..." : "Send reset link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default AuthPage;