import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";

// Where a returning user always lands after signing in, mirroring the
// password flow in useAuthViewModel. A first-time Google sign-up instead
// resumes whatever screen it started from (the ?from= param below).
const LOGIN_DESTINATION = "/dashboard";
const DEFAULT_FROM = "/";

// A brand-new Google account has an identity whose last_sign_in_at is the
// same instant it was created. Any returning user has signed in since, so
// the two timestamps diverge - a few seconds of tolerance keeps clock
// granularity on that very first sign-in from reading as "returning".
const NEW_USER_TOLERANCE_MS = 5000;

// If no session has shown up on the client after this long, the OAuth
// round trip failed or the page was opened directly. An MFA step-up still
// in progress is *not* this case - it leaves an aal1 session on the client
// (checked before giving up), it just hasn't been finalized yet.
const WAIT_TIMEOUT_MS = 8000;

export function useAuthCallbackViewModel() {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Set true from the timeout below once we're sure no session is coming.
  const [waitTimedOut, setWaitTimedOut] = useState(false);

  // Captured once - the origin screen must not shift under a re-render.
  const fromRef = useRef(searchParams.get("from") || DEFAULT_FROM);

  // Google can hand back an error instead of a session (user backed out at
  // the consent screen, provider misconfigured on the Supabase project) -
  // it arrives in the query string, and no session will ever follow it.
  // Derived, not stored: it's known synchronously on the first render.
  const status = (searchParams.get("error") || waitTimedOut) ? "failed" : "finishing";

  // Session finalized (isAuthenticated flips true - this also waits out a
  // global MFA step-up, which holds it false until the code is verified).
  // Decide the destination from the Google identity's timestamps.
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      const identity = data.session?.user?.identities?.[0];
      const createdAt = identity ? Date.parse(identity.created_at) : NaN;
      const lastSignInAt = identity ? Date.parse(identity.last_sign_in_at) : NaN;
      const isReturningUser =
        Number.isFinite(createdAt) &&
        Number.isFinite(lastSignInAt) &&
        lastSignInAt - createdAt > NEW_USER_TOLERANCE_MS;

      navigate(isReturningUser ? LOGIN_DESTINATION : fromRef.current, { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, navigate]);

  // Grace period for the failure case. Only give up if the client truly
  // holds no session - an aal1 session means an MFA step-up is still open
  // (the global modal owns that UX), so keep waiting rather than bouncing
  // out from under it.
  useEffect(() => {
    if (isAuthenticated) return;

    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setWaitTimedOut(true);
      }
    }, WAIT_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  const returnToLogin = () => navigate("/auth", { replace: true });

  return { status, returnToLogin };
}
