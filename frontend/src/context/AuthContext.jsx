import { createContext, useRef, useState } from "react";
import { logIn, logOut, signUp } from "../services/api";

export const AuthContext = createContext();

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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadStoredSession);
  const [toastMessage, setToastMessage] = useState(null);
  // A ref (not state) for the pending dismiss timer id: it's an imperative
  // handle we need to clear/replace, not something that should trigger a
  // re-render on its own.
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    // Clear any timer from a previous toast first, so signing in twice in
    // quick succession resets the 3s countdown instead of the first timer
    // dismissing the second toast early.
    clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

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

  const logOutUser = async () => {
    await logOut(session?.accessToken).catch(() => {});
    setSession(null);
    persistSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: Boolean(session?.accessToken),
        signUp: signUpUser,
        logIn: logInUser,
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
