import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export function useAuthViewModel() {
  const { signUp, logIn, isAuthenticated } = useContext(AuthContext);
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
        await logIn({ identifier, password });
      }
      navigate(from);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
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
  };
}
