import { useAuthViewModel } from "./useAuthViewModel";

// Functional-only for now (no styling pass yet, per project direction).
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
  } = useAuthViewModel();

  if (confirmationRequired) {
    return (
      <div className="auth-page">
        <p>Check your email to confirm your account, then log in.</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>{mode === "signup" ? "Sign Up" : "Log In"}</h1>

      <form onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
          </>
        ) : (
          <label>
            Email or Username
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="auth-error" style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : mode === "signup" ? "Sign Up" : "Log In"}
        </button>
      </form>

      <button type="button" onClick={toggleMode}>
        {mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}

export default AuthPage;
