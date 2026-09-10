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
  // Dedupes the "signed in" toast when the same access token gets finalized
  // more than once - see finalizeSession below for why that can happen.
  const lastToastedTokenRef = useRef(null);

  // Set once a password or Google sign-in comes back at a lower assurance
  // level than the account requires (i.e. it has a verified TOTP factor
  // enrolled) - holds everything the step-up modal below needs to finish
  // the job. Non-null blocks the sign-in from finalizing: isAuthenticated
  // stays false, nothing is persisted, no toast, until the code is verified.
  const [pendingMfa, setPendingMfa] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState("");

  // Hydrates the frontend Supabase client with whatever session was just
  // restored from localStorage, on mount only. Without this, a page
  // reload leaves *our* state correctly logged in (loadStoredSession
  // above) while this client - used directly for Google OAuth, password
  // reset, and now MFA - stays completely unaware of it, since it's only
  // ever synced live during an actual login action (checkAssuranceAndFinalize
  // below). Any mfa.* call made from a page like Settings would otherwise
  // silently fail against an empty/anonymous session after every reload.
  // Harmless no-op if there's no stored session, or if it's a Google one
  // (already synced natively via its own persisted storage).
  useEffect(() => {
    if (session?.accessToken && session?.refreshToken) {
      supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      }).then(({ error }) => {
        if (error) {
          // The stored session is no longer valid (e.g. its refresh token
          // was already rotated/used, or revoked by an earlier global-scope
          // sign-out) - clear it instead of leaving dead tokens sitting in
          // state/localStorage, where they'd keep failing on every later
          // Supabase-direct call (Settings' MFA calls, the next logout, ...)
          // with a 403 that has nothing to do with whatever the user is
          // actually doing at that point.
          setSession(null);
          persistSession(null);
        }
      });
    }
    // Deliberately empty deps - this is a one-time hydration of whatever
    // was in localStorage at mount, not a sync that should re-run when
    // `session` changes afterward (login/logout already keep the client
    // in sync going forward through their own dedicated code paths).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // The single "this sign-in is actually complete" point, however it got
  // here - a direct password/Google login with no MFA enrolled, or an MFA
  // step-up that just got verified. Token-based dedup on the toast because
  // this can legitimately be called twice for the same sign-in: once when
  // supabase.auth.setSession() below fires the onAuthStateChange listener,
  // and again if that listener's own SIGNED_IN handling calls this too.
  const finalizeSession = useCallback(({ accessToken, refreshToken, user }) => {
    const next = { accessToken, refreshToken, user };
    setSession(next);
    persistSession(next);
    setPendingMfa(null);
    setMfaCode("");
    setMfaError("");

    if (lastToastedTokenRef.current !== accessToken) {
      lastToastedTokenRef.current = accessToken;
      showToast(`Signed in as ${user?.username || user?.fullName || user?.email}`);
    }
  }, [showToast]);

  // Shared by password login, signup, and Google sign-in: given a fresh set
  // of tokens, decide whether the account needs an MFA step-up before this
  // sign-in counts as complete. Returns true if it does (pendingMfa is now
  // set, caller should stop and let the global modal take over) or false if
  // the session was finalized directly.
  const checkAssuranceAndFinalize = useCallback(async (
    { accessToken, refreshToken, user },
    { clientAlreadySynced = false } = {},
  ) => {
    // Make sure the frontend Supabase client actually holds these tokens
    // before asking it anything about assurance level or factors - required
    // for the password-login path (this client never saw backend-issued
    // tokens otherwise). Skipped when the caller is the onAuthStateChange
    // listener below: the client already holds the session (that's what
    // fired the event), and calling setSession() again there re-emits
    // SIGNED_IN straight back into that listener - an infinite loop.
    if (!clientAlreadySynced) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setSessionError) {
        // Should be unreachable for a token that just came back from a
        // successful login/signup, but if the client rejects it for some
        // reason, don't proceed to check assurance level against a session
        // it doesn't actually have - surface it as a real login failure
        // instead of silently mis-gating.
        throw setSessionError;
      }
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      // The session the client holds isn't actually valid (e.g. a stale
      // token restored from localStorage that the server now 403s). Don't
      // finalize it - throw so the caller can clear it instead.
      throw aalError;
    }
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factorId = factorsData?.totp?.[0]?.id;
      if (factorId) {
        setPendingMfa({ factorId, accessToken, refreshToken, user });
        return true;
      }
      // AAL claims a step-up is needed but no confirmed TOTP factor was
      // found - degrade gracefully (finalize anyway) rather than locking
      // the user out over a state that shouldn't be reachable.
    }

    finalizeSession({ accessToken, refreshToken, user });
    return false;
  }, [finalizeSession]);

  const signUpUser = async (credentials) => {
    const authResponse = await signUp(credentials);
    if (authResponse.email_confirmation_required) {
      return authResponse;
    }
    // A brand new account can't have an MFA factor enrolled yet, but this
    // still goes through the shared check rather than a separate direct
    // path - one extra no-op round trip buys one code path instead of two.
    await checkAssuranceAndFinalize({
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      user: authResponse.user,
    });
    return authResponse;
  };

  const logInUser = async (credentials) => {
    const authResponse = await logIn(credentials);
    const gated = await checkAssuranceAndFinalize({
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      user: authResponse.user,
    });
    return gated ? { mfaRequired: true } : authResponse;
  };

  // Redirects the whole page to Google - nothing after this call runs in
  // the current page load. Always comes back to /auth/callback rather than
  // straight to `from`: that route waits for the session to finalize (incl.
  // any MFA step-up) and then decides where to land - a returning Google
  // user goes to the dashboard, a first-time sign-up resumes `from`. `from`
  // (e.g. "/" or "/dashboard") is where the user started; it has to survive
  // an actual cross-site navigation, so it rides along as a query param
  // instead of React Router state. The session itself is picked up by the
  // onAuthStateChange listener below via supabase-js's detectSessionInUrl.
  const signInWithGoogle = async (from) => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("from", from);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
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

  // MFA enrollment/management, used by SettingsPage. All plain passthroughs
  // to Supabase Auth - acting on whichever session the frontend client
  // currently holds, same as everything else in this file.
  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) throw error;
    return data; // { id, totp: { qr_code, secret, uri } }
  };

  // Enrolling alone doesn't activate a factor - Supabase requires one
  // successful challenge/verify to confirm the user actually captured the
  // secret correctly before it counts for login gating.
  const confirmMfaEnrollment = async (factorId, code) => {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw verifyError;
  };

  const unenrollMfa = async (factorId) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
  };

  const listMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data; // { totp: [...], phone: [...] }
  };

  // Submits the code from the global step-up modal - completes whichever
  // sign-in (password or Google) is currently pending in pendingMfa.
  const handleMfaVerifySubmit = async (event) => {
    event.preventDefault();
    if (!pendingMfa) return;

    setMfaError("");
    setMfaVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: pendingMfa.factorId,
      });
      if (challengeError) throw challengeError;

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: pendingMfa.factorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      // The verified session's tokens (aal2) replace the pending (aal1)
      // ones - the account identity (pendingMfa.user) doesn't change.
      finalizeSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: pendingMfa.user,
      });
    } catch (err) {
      setMfaError(err.message || "Invalid code. Please try again.");
    } finally {
      setMfaVerifying(false);
    }
  };

  // Backs out of the whole sign-in attempt rather than leaving a half
  // authenticated (aal1) session sitting in the frontend Supabase client.
  const handleMfaCancel = () => {
    supabase.auth.signOut().catch(() => {});
    setPendingMfa(null);
    setMfaCode("");
    setMfaError("");
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

  // The other half of the Google flow, and now also where a completed MFA
  // step-up can surface (its exact event name isn't load-bearing here -
  // finalizeSession's own token-based dedup makes a redundant call
  // harmless either way). A fresh "SIGNED_IN" goes through the same
  // assurance-level gate password login uses, so Google sign-ins are
  // gated too. Anything else (INITIAL_SESSION restore, TOKEN_REFRESHED) is
  // an already-established session - just keep our state in sync, no
  // re-gating. A null session (e.g. plain "SIGNED_OUT") is ignored rather
  // than clearing state, so it can't stomp on an existing password-based
  // session that this client was never otherwise party to.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (!supabaseSession) return;

      const next = fromSupabaseSession(supabaseSession);

      if (event === "SIGNED_IN") {
        // clientAlreadySynced: the client already holds this session (that's
        // why we're in this callback) - re-setting it would loop straight
        // back here. No form/page is actively awaiting this (a Google
        // redirect can land anywhere) - catch rather than let a rejection go
        // unhandled, since there's no UI here to throw an error into.
        checkAssuranceAndFinalize(next, { clientAlreadySynced: true }).catch(() => {});
        return;
      }

      setSession(next);
      persistSession(next);
    });

    return () => subscription.unsubscribe();
  }, [checkAssuranceAndFinalize]);

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
        enrollMfa,
        confirmMfaEnrollment,
        unenrollMfa,
        listMfaFactors,
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

      {/* Global, not page-local: a Google sign-in can land the user on any
          page (wherever redirectTo pointed), so the step-up prompt has to
          be able to appear there too, not just on the login page. */}
      {pendingMfa && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: "1.5rem",
            boxSizing: "border-box",
            zIndex: 200,
          }}
        >
          <form
            onSubmit={handleMfaVerifySubmit}
            style={{
              width: "100%",
              maxWidth: "22rem",
              background: "#fff",
              borderRadius: "1.25rem",
              padding: "2rem",
              boxSizing: "border-box",
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", color: "#222" }}>
              Two-factor authentication
            </h2>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "#6b7280" }}>
              Enter the 6-digit code from your authenticator app.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              placeholder="123456"
              maxLength={6}
              autoFocus
              style={{
                width: "100%",
                height: "2.9rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.6rem",
                padding: "0 0.9rem",
                boxSizing: "border-box",
                fontSize: "1.1rem",
                letterSpacing: "0.2em",
                textAlign: "center",
                marginBottom: "1rem",
              }}
            />

            {mfaError && (
              <p style={{ margin: "0 0 1rem", color: "#d0190f", fontSize: "0.875rem" }}>{mfaError}</p>
            )}

            <button
              type="submit"
              disabled={mfaVerifying || mfaCode.length < 6}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "999px",
                padding: "0.85rem 1rem",
                background: "linear-gradient(180deg, #4f7df0, #2f5fc9)",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 500,
                cursor: mfaVerifying ? "not-allowed" : "pointer",
                opacity: mfaVerifying || mfaCode.length < 6 ? 0.7 : 1,
                marginBottom: "0.75rem",
              }}
            >
              {mfaVerifying ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={handleMfaCancel}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: "#6b7280",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {children}
    </AuthContext.Provider>
  );
}
