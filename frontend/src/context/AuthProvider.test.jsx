// Regression tests for AuthProvider's session-sync plumbing (FR16 -
// "create and authenticate accounts"), added after an infinite recursion
// shipped in the MFA/Google-OAuth path:
//
//   checkAssuranceAndFinalize() called supabase.auth.setSession(), which
//   makes supabase-js emit a SIGNED_IN event, which the onAuthStateChange
//   listener handled by calling checkAssuranceAndFinalize() again -> which
//   called setSession() again -> ... until the tab locked up. It only bit
//   on reload with a stored session whose token the server now rejects,
//   because a valid token's redundant SIGNED_IN pass is otherwise a no-op.
//
// The fake supabase client below reproduces the one behaviour that made it
// recurse: setSession() notifies every onAuthStateChange subscriber with a
// SIGNED_IN event, exactly like the real SDK. Its setSession mock also
// hard-fails past a small call ceiling so a reintroduced loop fails the
// test loudly instead of hanging the runner.
//
// Test Case IDs: TC-51 .. TC-54 (QA Plan traceability matrix, FR16).
import { useContext } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./AuthProvider";
import { AuthContext } from "./AuthContext";

const SETSESSION_CALL_CEILING = 8;

const h = vi.hoisted(() => {
  const listeners = new Set();

  const state = {
    setSessionCalls: 0,
    // When true, setSession resolves with an error and emits nothing -
    // mirrors supabase-js rejecting a revoked/rotated refresh token.
    setSessionShouldFail: false,
    // Lets a test make the post-SIGNED_IN assurance-level probe fail.
    aalError: null,
    aal: { currentLevel: "aal1", nextLevel: "aal1" },
    factors: { totp: [] },
  };

  const emit = (event, session) => {
    for (const cb of [...listeners]) cb(event, session);
  };

  const makeSession = (accessToken, refreshToken) => ({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: "u1", email: "user@example.com", user_metadata: {} },
  });

  const auth = {
    setSession: vi.fn(async ({ access_token, refresh_token }) => {
      state.setSessionCalls += 1;
      if (state.setSessionCalls > SETSESSION_CALL_CEILING) {
        throw new Error(
          `supabase.auth.setSession called ${state.setSessionCalls}x - ` +
            "runaway onAuthStateChange -> setSession recursion",
        );
      }
      if (state.setSessionShouldFail) {
        return {
          data: { session: null, user: null },
          error: { message: "Invalid Refresh Token", status: 403 },
        };
      }
      const session = makeSession(access_token, refresh_token);
      // The real SDK fires SIGNED_IN on every successful setSession(), and
      // does so asynchronously (after its own await points) - so the
      // onAuthStateChange listener registered by a later useEffect is
      // already subscribed by the time it lands. Emitting on a microtask
      // here is what lets the mount-hydration path actually feed the loop.
      await Promise.resolve();
      emit("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    }),
    onAuthStateChange: vi.fn((cb) => {
      listeners.add(cb);
      return {
        data: { subscription: { unsubscribe: () => listeners.delete(cb) } },
      };
    }),
    signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    mfa: {
      getAuthenticatorAssuranceLevel: vi.fn(async () => ({
        data: state.aalError ? null : state.aal,
        error: state.aalError,
      })),
      listFactors: vi.fn(async () => ({ data: state.factors, error: null })),
      enroll: vi.fn(async () => ({ data: { id: "f1", totp: {} }, error: null })),
      challenge: vi.fn(async () => ({ data: { id: "c1" }, error: null })),
      verify: vi.fn(async () => ({
        data: { access_token: "at2", refresh_token: "rt2" },
        error: null,
      })),
      unenroll: vi.fn(async () => ({ error: null })),
    },
  };

  return { supabase: { auth }, state, emit, makeSession };
});

vi.mock("../services/supabaseClient", () => ({ supabase: h.supabase }));
vi.mock("../services/api", () => ({
  logIn: vi.fn(),
  logOut: vi.fn(async () => ({})),
  signUp: vi.fn(),
}));

const { supabase, state, emit, makeSession } = h;

function Probe() {
  const { isAuthenticated, user } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="email">{user?.email ?? ""}</span>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const storedSession = {
  accessToken: "stored-access",
  refreshToken: "stored-refresh",
  user: { id: "u1", email: "user@example.com", username: "user" },
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  state.setSessionCalls = 0;
  state.setSessionShouldFail = false;
  state.aalError = null;
  state.aal = { currentLevel: "aal1", nextLevel: "aal1" };
  state.factors = { totp: [] };
});

describe("AuthProvider session-sync recursion guard", () => {
  it("TC-51: mount hydration from a stored session does not loop setSession via onAuthStateChange", async () => {
    localStorage.setItem("auth", JSON.stringify(storedSession));

    renderProvider();
    await flush();
    await flush();

    // Mount hydration calls setSession once. The SIGNED_IN it triggers must
    // be absorbed by the listener WITHOUT another setSession call. Buggy
    // code blows past the ceiling and the mock throws.
    expect(supabase.auth.setSession).toHaveBeenCalledTimes(1);
    expect(state.setSessionCalls).toBeLessThanOrEqual(SETSESSION_CALL_CEILING);
  });

  it("TC-52: a SIGNED_IN delivered by the SDK (OAuth return) finalizes without re-entering setSession", async () => {
    renderProvider();
    await flush();

    // supabase-js already holds the session when it emits this - the
    // listener must not setSession() it back in.
    emit("SIGNED_IN", makeSession("oauth-access", "oauth-refresh"));

    await waitFor(() =>
      expect(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel,
      ).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("yes"),
    );

    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("email")).toHaveTextContent("user@example.com");
  });

  it("TC-53: a stale stored session is cleared, not finalized, and is not retried", async () => {
    localStorage.setItem("auth", JSON.stringify(storedSession));
    state.setSessionShouldFail = true;

    renderProvider();

    await waitFor(() => expect(localStorage.getItem("auth")).toBeNull());
    await flush();

    expect(supabase.auth.setSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
  });

  it("TC-54: a SIGNED_IN whose assurance-level probe fails is dropped, not finalized", async () => {
    renderProvider();
    await flush();

    state.aalError = { message: "session missing", status: 403 };
    emit("SIGNED_IN", makeSession("oauth-access", "oauth-refresh"));

    await waitFor(() =>
      expect(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel,
      ).toHaveBeenCalled(),
    );
    await flush();

    expect(screen.getByTestId("auth")).toHaveTextContent("no");
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });
});
