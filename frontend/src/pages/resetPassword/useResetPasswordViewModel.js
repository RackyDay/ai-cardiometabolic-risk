import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";

// How long to wait for the recovery session to show up before treating the
// link as invalid/expired. Generous, since it only has to cover the time
// between this page mounting and supabase-js finishing its own (fast)
// parsing of the tokens Supabase's redirect appended to the URL.
const VERIFY_TIMEOUT_MS = 5000;

export function useResetPasswordViewModel() {
  const { updatePassword } = useContext(AuthContext);
  const navigate = useNavigate();

  // "verifying" while confirming the emailed link's recovery session
  // actually landed, "ready" once it has (shows the form), "invalid" if
  // nothing arrives in time - the link was already used, expired, or this
  // page was opened directly rather than via the email.
  const [status, setStatus] = useState("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let settled = false;

    // The recovery link's redirect lands here with the session already
    // encoded in the URL - supabase-js's default detectSessionInUrl parses
    // it and fires this listener with event "PASSWORD_RECOVERY". This is
    // the authoritative signal; getSession() below is only a safety net
    // for the case where that parsing finished before this listener
    // attached (a real possibility, not just theoretical).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !settled) {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !settled) {
        settled = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setStatus("invalid");
      }
    }, VERIFY_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      // Brief pause so the success message is actually readable before
      // leaving - they're already signed in at this point (the recovery
      // session upgrades to a normal one once the password update
      // succeeds), so there's no separate login step needed.
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError(err.message || "Couldn't update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    status,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isSubmitting,
    error,
    success,
    handleSubmit,
  };
}
