import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import { logIn, logOut, signUp } from "../services/api";
import { supabase } from "../services/supabaseClient";

const STORAGE_KEY = "auth";
const TOAST_DURATION_MS = 3000;

// Read the session back from localStorage on load so a page refresh (or a
// brand new tab) doesn't drop a logged-in user back to Guest - the backend
// tokens are the source of truth for whether they're actually still valid,
// this is just what state to start the app in.
const loadStoredSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistSession = (session) => {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Converts a supabase-js Session (only ever produced by the Google OAuth
// flow - see signInWithGoogle/onAuthStateChange below) into the same
// {accessToken, refreshToken, user} shape our backend's AuthResponse
// produces for password login, so both flows share one session shape from
// here on. username stays null for Google sign-ups - nothing sets it in
// user_metadata - which every display fallback already handles; fullName
// is Google-only extra, used as a nicer fallback than a bare email.
const fromSupabaseSession = (supabaseSession) => ({
  accessToken: supabaseSession.access_token,
  refreshToken: supabaseSession.refresh_token,
  user: {
    id: supabaseSession.user.id,
    email: supabaseSession.user.email,
    username: supabaseSession.user.user_metadata?.username ?? null,
    fullName: supabaseSession.user.user_metadata?.full_name ?? null,
  },
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadStoredSession);
  const [toastMessage, setToastMessage] = useState(null);
  // A ref (not state) for the pending dismiss timer id: it's an imperative
  // handle we need to clear/replace, not something that should trigger a
  // re-render on its own.
  const toastTimeoutRef = useRef(null);

  // useCallback so this has a stable identity - it's used inside the
  // onAuthStateChange effect below, and without a stable identity it'd
  // either need to be a dependency that re-subscribes the listener on
  // every render, or get called from a stale closure.
  const showToast = useCallback((message) => {
    // Clear any timer from a previous toast first, so signing in twice in
    // quick succession resets the 3s countdown instead of the first timer
    // dismissing the second toast early.
    clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }, []);

  // Shared by signUp/logIn: turn a backend AuthResponse into local session
  // state. Bails out without establishing a session when Supabase requires
  // email confirmation - there's no access token yet in that case, so
  // there's nothing to persist and nothing to show a "signed in" toast for.
  const applySession = (authResponse) => {
    if (authResponse.email_confirmation_required) {
      return authResponse;
    }

    const next = {
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      user: authResponse.user,
    };
    setSession(next);
    persistSession(next);
    showToast(`Signed in as ${next.user?.username || next.user?.email}`);
    return authResponse;
  };

  const signUpUser = async (credentials) => applySession(await signUp(credentials));

  const logInUser = async (credentials) => applySession(await logIn(credentials));

  // Redirects the whole page to Google - nothing after this call runs in
  // the current page load. `from` (e.g. "/" or "/dashboard") is where the
  // user started, same idea as the password flow's location.state.from,
  // but it has to survive an actual cross-site navigation here, so it's
  // baked into redirectTo instead of React Router state. Coming back is
  // handled entirely by the onAuthStateChange listener below - Supabase
  // redirects the browser straight back to that URL with a session already
  // established, and supabase-js's default detectSessionInUrl notices it.
  const signInWithGoogle = async (from) => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${from}` },
    });
  };

  // Sends a password-reset email. Deliberately email-only, unlike login's
  // email-or-username: there's no secure way to prove account ownership
  // from a username alone, so a reset link can only ever be sent to the
  // address it's actually tied to. Goes straight to Supabase (no backend
  // endpoint) - resetPasswordForEmail is a plain passthrough with no extra
  // business logic, same reasoning as the Google OAuth flow.
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Only valid while the caller holds the temporary recovery session
  // Supabase establishes when the emailed reset link is clicked (see
  // ResetPasswordPage) - there's no "reset someone else's password" API,
  // this always acts on whoever's session is currently active.
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const logOutUser = async () => {
    await logOut(session?.accessToken).catch(() => {});
    // Also clears supabase-js's own separately-persisted session. Without
    // this, a Google-authenticated session would still be sitting in its
    // own localStorage entry and silently restore itself via
    // onAuthStateChange's INITIAL_SESSION on the next page load, undoing
    // this logout.
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
    persistSession(null);
  };

  // The other half of the Google flow. This client is never used to sign
  // in with a password (that goes straight to our backend), so any session
  // this fires with only ever came from Google - either just now (event
  // "SIGNED_IN", right after the OAuth redirect completes - toast-worthy),
  // or restored from supabase-js's own storage on a later page load
  // ("INITIAL_SESSION" - already-known, no toast) or a background refresh
  // ("TOKEN_REFRESHED"). A null session here (e.g. a plain "SIGNED_OUT")
  // is ignored rather than clearing state, so it can't stomp on an
  // existing password-based session that this client was never party to.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (!supabaseSession) return;

      const next = fromSupabaseSession(supabaseSession);
      setSession(next);
      persistSession(next);

      if (event === "SIGNED_IN") {
        showToast(`Signed in as ${next.user.username || next.user.fullName || next.user.email}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: Boolean(session?.accessToken),
        signUp: signUpUser,
        logIn: logInUser,
        signInWithGoogle,
        requestPasswordReset,
        updatePassword,
        logOut: logOutUser,
      }}
    >
      {/* Rendered here (inside the provider, above all routes) so a sign-in
          toast survives the navigate() that immediately follows it, instead
          of being tied to whichever page triggered it. role="status" so
          screen readers announce it without needing focus. */}
      {toastMessage && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            background: "#1a1a2e",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            fontSize: "14px",
          }}
        >
          {toastMessage}
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
