import { useSettingsViewModel } from "./useSettingsViewModel";

// Functional-only for now (no styling pass yet, per project direction).
// Starting point for account configuration - currently read-only.
function SettingsPage() {
  const { user } = useSettingsViewModel();

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
    </div>
  );
}

export default SettingsPage;
