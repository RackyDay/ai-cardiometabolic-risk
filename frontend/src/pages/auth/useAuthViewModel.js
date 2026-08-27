import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export function useAuthViewModel() {
  const { signUp, logIn, signInWithGoogle, requestPasswordReset, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  // Wherever the user navigated here from (e.g. "/" or "/dashboard") -
  // navigate() there on success so the flow returns to its origin.
  const from = location.state?.from || "/";

  // Login/signup is disabled once already logged in - bounce anyone who
  // lands here directly (typed URL, back button) back to where they came
  // from instead of showing the form.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSubmitting, setForgotPasswordSubmitting] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setConfirmationRequired(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const result = await signUp({ email, username, password });
        if (result.email_confirmation_required) {
          setConfirmationRequired(true);
          return;
        }
      } else {
        const result = await logIn({ identifier, password });
        if (result?.mfaRequired) {
          // Not actually signed in yet - the global code-entry modal
          // (rendered from AuthProvider) takes over from here. Stay put;
          // the effect above navigates away once it resolves and
          // isAuthenticated flips to true.
          return;
        }
      }
      navigate(from);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      // Redirects the whole page - on success, this call never actually
      // returns here. An error only surfaces if the redirect itself
      // couldn't be started (e.g. the Google provider isn't enabled on the
      // Supabase project yet).
      await signInWithGoogle(from);
    } catch (err) {
      setError(err.message || "Couldn't start Google sign-in. Please try again.");
    }
  };

  const openForgotPassword = () => {
    setForgotPasswordEmail("");
    setForgotPasswordError("");
    setForgotPasswordSent(false);
    setIsForgotPasswordOpen(true);
  };

  const closeForgotPassword = () => setIsForgotPasswordOpen(false);

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordSubmitting(true);

    try {
      await requestPasswordReset(forgotPasswordEmail);
      // Always show the same "check your email" result regardless of
      // whether the address is actually registered - Supabase's own
      // resetPasswordForEmail already behaves this way (no error either),
      // so a reset request can't be used to test which emails have accounts.
      setForgotPasswordSent(true);
    } catch (err) {
      setForgotPasswordError(err.message || "Something went wrong. Please try again.");
    } finally {
      setForgotPasswordSubmitting(false);
    }
  };

  return {
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
    handleGoogleSignIn,
    isForgotPasswordOpen,
    openForgotPassword,
    closeForgotPassword,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    forgotPasswordSubmitting,
    forgotPasswordError,
    forgotPasswordSent,
    handleForgotPasswordSubmit,
  };
}
