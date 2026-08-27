import { useSettingsViewModel } from "./useSettingsViewModel";

// Functional-only for now (no styling pass yet, per project direction).
// Starting point for account configuration - username/email are read-only,
// two-factor authentication is the one fully interactive piece so far.
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
  } = useSettingsViewModel();

  if (!user) return null;

  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      <dl>
        <dt>Username</dt>
        <dd>{user.username}</dd>

        <dt>Email</dt>
        <dd>{user.email}</dd>
      </dl>

      <h2>Two-Factor Authentication</h2>
      <p>
        Optional extra layer of security: once enabled, signing in (by password or Google) also
        requires a 6-digit code from an authenticator app on your phone.
      </p>

      {mfaLoadError && <p>{mfaLoadError}</p>}

      {mfaStatus === "loading" && <p>Loading...</p>}

      {mfaStatus === "disabled" && !enrollment && (
        <button type="button" onClick={handleEnableClick}>
          Enable two-factor authentication
        </button>
      )}

      {enrollment && (
        <form onSubmit={handleConfirmEnrollment}>
          <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.):</p>
          <img src={enrollment.qrCode} alt="Two-factor authentication QR code" width={200} height={200} />
          <p>Or enter this code manually: {enrollment.secret}</p>

          <label>
            Enter the 6-digit code from your app to confirm
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

          {enrollError && <p>{enrollError}</p>}

          <button type="submit" disabled={enrollSubmitting || enrollCode.length < 6}>
            {enrollSubmitting ? "Confirming..." : "Confirm"}
          </button>
          <button type="button" onClick={handleCancelEnrollment}>
            Cancel
          </button>
        </form>
      )}

      {mfaStatus === "enabled" && (
        <>
          <p>Two-factor authentication is enabled.</p>
          {unenrollError && <p>{unenrollError}</p>}
          <button type="button" onClick={handleDisableClick} disabled={unenrollSubmitting}>
            {unenrollSubmitting ? "Disabling..." : "Disable two-factor authentication"}
          </button>
        </>
      )}
    </div>
  );
}

export default SettingsPage;
