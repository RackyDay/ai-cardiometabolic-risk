import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

// Mirrors SignUpRequest.username / UpdateUsernameRequest on the backend -
// checked here first so an obviously bad value fails instantly instead of
// after a round trip.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

export function useSettingsViewModel() {
  const {
    user,
    isAuthenticated,
    changeUsername,
    changePassword,
    deleteAccount,
    enrollMfa,
    confirmMfaEnrollment,
    unenrollMfa,
    listMfaFactors,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Typed into the delete-account confirmation box to prove intent - the
  // username if there is one, otherwise the email (Google sign-ups have no
  // username).
  const deleteConfirmPhrase = user?.username || user?.email || "";

  // Account configuration only makes sense while logged in - bounce anyone
  // who lands here directly (typed URL, stale link) back to Welcome.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // "loading" until listMfaFactors() resolves, then "disabled" (no
  // confirmed factor) or "enabled" (one is active and gating login).
  const [mfaStatus, setMfaStatus] = useState("loading");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaLoadError, setMfaLoadError] = useState("");

  // Non-null only mid-enrollment: the just-created (not yet confirmed)
  // factor's QR code/secret, waiting on a code to activate it.
  const [enrollment, setEnrollment] = useState(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const [unenrollSubmitting, setUnenrollSubmitting] = useState(false);
  const [unenrollError, setUnenrollError] = useState("");

  // --- Edit username --------------------------------------------------
  // Seeded from the current name. The stored session hydrates synchronously
  // on mount (AuthProvider's useState(loadStoredSession)), so `user` is
  // already populated here for the logged-in case this page is gated to;
  // anyone not authenticated is redirected away by the effect above before
  // this field is ever shown.
  const [usernameInput, setUsernameInput] = useState(user?.username || "");
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    setUsernameError("");
    setUsernameSuccess(false);

    const next = usernameInput.trim();
    if (next === (user?.username || "")) {
      setUsernameError("That's already your username.");
      return;
    }
    if (!USERNAME_PATTERN.test(next)) {
      setUsernameError(
        "Username must be 3-32 characters, letters, numbers, and underscores only.",
      );
      return;
    }

    setUsernameSubmitting(true);
    try {
      await changeUsername(next);
      setUsernameSuccess(true);
    } catch (err) {
      setUsernameError(err.message || "Couldn't update your username. Please try again.");
    } finally {
      setUsernameSubmitting(false);
    }
  };

  // --- Change password ----------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from your current one.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Couldn't update your password. Please try again.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // --- Delete account ---------------------------------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openDeleteConfirm = () => {
    setDeleteError("");
    setDeleteOpen(true);
  };

  const cancelDeleteConfirm = () => {
    setDeleteOpen(false);
    setDeletePassword("");
    setDeleteConfirmInput("");
    setDeleteError("");
  };

  const deleteConfirmed = deleteConfirmInput.trim() === deleteConfirmPhrase;

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setDeleteError("");

    if (!deleteConfirmed) {
      setDeleteError(`Type "${deleteConfirmPhrase}" exactly to confirm.`);
      return;
    }

    setDeleteSubmitting(true);
    try {
      await deleteAccount(deletePassword);
      // Session's already been torn down inside deleteAccount; leave the
      // now-defunct settings page for the public landing page. replace: so
      // Back doesn't return to a page that immediately bounces anyway.
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete your account. Please try again.");
      setDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    listMfaFactors()
      .then((factors) => {
        if (cancelled) return;
        const verified = factors?.totp?.find((factor) => factor.status === "verified");
        if (verified) {
          setMfaFactorId(verified.id);
          setMfaStatus("enabled");
        } else {
          setMfaStatus("disabled");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMfaLoadError(err.message || "Couldn't load your two-factor authentication status.");
        setMfaStatus("disabled");
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, listMfaFactors]);

  const handleEnableClick = async () => {
    setEnrollError("");
    try {
      const data = await enrollMfa();
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err) {
      setEnrollError(err.message || "Couldn't start enrollment. Please try again.");
    }
  };

  const handleConfirmEnrollment = async (event) => {
    event.preventDefault();
    if (!enrollment) return;

    setEnrollError("");
    setEnrollSubmitting(true);
    try {
      await confirmMfaEnrollment(enrollment.factorId, enrollCode);
      setMfaFactorId(enrollment.factorId);
      setMfaStatus("enabled");
      setEnrollment(null);
      setEnrollCode("");
    } catch (err) {
      setEnrollError(err.message || "That code didn't work. Please try again.");
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleCancelEnrollment = () => {
    // Best-effort: an unconfirmed factor doesn't count for login gating
    // either way, but there's no reason to leave it sitting around.
    if (enrollment) {
      unenrollMfa(enrollment.factorId).catch(() => {});
    }
    setEnrollment(null);
    setEnrollCode("");
    setEnrollError("");
  };

  const handleDisableClick = async () => {
    if (!mfaFactorId) return;

    setUnenrollError("");
    setUnenrollSubmitting(true);
    try {
      await unenrollMfa(mfaFactorId);
      setMfaFactorId(null);
      setMfaStatus("disabled");
    } catch (err) {
      setUnenrollError(err.message || "Couldn't disable two-factor authentication. Please try again.");
    } finally {
      setUnenrollSubmitting(false);
    }
  };

  return {
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

    usernameInput,
    setUsernameInput,
    usernameSubmitting,
    usernameError,
    usernameSuccess,
    handleUsernameSubmit,

    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordSubmitting,
    passwordError,
    passwordSuccess,
    handlePasswordSubmit,

    deleteOpen,
    deleteConfirmPhrase,
    deletePassword,
    setDeletePassword,
    deleteConfirmInput,
    setDeleteConfirmInput,
    deleteConfirmed,
    deleteSubmitting,
    deleteError,
    openDeleteConfirm,
    cancelDeleteConfirm,
    handleDeleteAccount,
  };
}
