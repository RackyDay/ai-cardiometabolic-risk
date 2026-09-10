import { useSettingsViewModel } from "./useSettingsViewModel";
import "./SettingsPage.css";

function SettingsPage() {
  const {
    user,
    mfaStatus,
    mfaLoadError,
    enrollment,
    enrollCode,
    setEnrollCode,
    enrollSubmitting,
    enrollError,
    handleEnableClick,
    handleConfirmEnrollment,
    handleCancelEnrollment,
    unenrollSubmitting,
    unenrollError,
    handleDisableClick,
    usernameInput,
    setUsernameInput,
    usernameSubmitting,
    usernameError,
    usernameSuccess,
    handleUsernameSubmit,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordSubmitting,
    passwordError,
    passwordSuccess,
    handlePasswordSubmit,
  } = useSettingsViewModel();

  if (!user) return null;

  return (
    <main className="settings-page">
      <section className="settings-subheader">
        <p>Manage your account information and security preferences.</p>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>Profile Information</h2>
            <p>Your basic account details.</p>
          </div>
        </div>

        <div className="profile-info-list">
          <div className="profile-info-row">
            <span className="profile-info-label">Email</span>
            <span className="profile-info-value">{user.email}</span>
          </div>
        </div>

        <form className="settings-edit-form" onSubmit={handleUsernameSubmit}>
          <label className="settings-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="your_username"
              minLength={3}
              maxLength={32}
              required
            />
          </label>

          {usernameError && <p className="settings-error">{usernameError}</p>}

          {usernameSuccess && (
            <p className="settings-success">Username updated.</p>
          )}

          <div className="settings-button-row">
            <button
              type="submit"
              className="settings-primary-button"
              disabled={usernameSubmitting}
            >
              {usernameSubmitting ? "Saving..." : "Save username"}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>Password</h2>
            <p>Change the password you use to sign in.</p>
          </div>
        </div>

        <form className="settings-edit-form" onSubmit={handlePasswordSubmit}>
          <label className="settings-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label className="settings-field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="settings-field">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          {passwordError && <p className="settings-error">{passwordError}</p>}

          {passwordSuccess && (
            <p className="settings-success">Password updated.</p>
          )}

          <div className="settings-button-row">
            <button
              type="submit"
              className="settings-primary-button"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? "Saving..." : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h2>Two-Factor Authentication</h2>
            <p>
              Add an extra layer of security to your account using an
              authenticator app.
            </p>
          </div>

          {mfaStatus === "enabled" && (
            <span className="status-badge enabled">Enabled</span>
          )}

          {mfaStatus === "disabled" && (
            <span className="status-badge disabled">Disabled</span>
          )}
        </div>

        {mfaLoadError && <p className="settings-error">{mfaLoadError}</p>}

        {mfaStatus === "loading" && (
          <p className="settings-muted">Loading security settings...</p>
        )}

        {mfaStatus === "disabled" && !enrollment && (
          <div className="mfa-action-box">
            <p>
              Once enabled, signing in will also require a 6-digit code from an
              authenticator app on your phone.
            </p>

            <button
              type="button"
              className="settings-primary-button"
              onClick={handleEnableClick}
            >
              Enable two-factor authentication
            </button>
          </div>
        )}

        {enrollment && (
          <form className="mfa-enrollment-form" onSubmit={handleConfirmEnrollment}>
            <div className="qr-section">
              <div className="qr-code-box">
                <img
                  src={enrollment.qrCode}
                  alt="Two-factor authentication QR code"
                  width={200}
                  height={200}
                />
              </div>

              <div className="qr-instructions">
                <h3>Scan QR Code</h3>
                <p>
                  Scan this QR code with Google Authenticator, Authy, 1Password,
                  or another authenticator app.
                </p>

                <div className="manual-code-box">
                  <span>Manual setup code</span>
                  <strong>{enrollment.secret}</strong>
                </div>
              </div>
            </div>

            <label className="settings-field">
              <span>Enter the 6-digit code from your app</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={enrollCode}
                onChange={(event) => setEnrollCode(event.target.value)}
                placeholder="123456"
                maxLength={6}
                required
              />
            </label>

            {enrollError && <p className="settings-error">{enrollError}</p>}

            <div className="settings-button-row">
              <button
                type="submit"
                className="settings-primary-button"
                disabled={enrollSubmitting || enrollCode.length < 6}
              >
                {enrollSubmitting ? "Confirming..." : "Confirm"}
              </button>

              <button
                type="button"
                className="settings-secondary-button"
                onClick={handleCancelEnrollment}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mfaStatus === "enabled" && (
          <div className="mfa-action-box">
            <p className="settings-success">
              Two-factor authentication is currently enabled for your account.
            </p>

            {unenrollError && <p className="settings-error">{unenrollError}</p>}

            <button
              type="button"
              className="settings-danger-button"
              onClick={handleDisableClick}
              disabled={unenrollSubmitting}
            >
              {unenrollSubmitting
                ? "Disabling..."
                : "Disable two-factor authentication"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default SettingsPage;