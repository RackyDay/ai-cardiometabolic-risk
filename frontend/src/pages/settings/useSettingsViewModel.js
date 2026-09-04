import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export function useSettingsViewModel() {
  const { user, isAuthenticated, enrollMfa, confirmMfaEnrollment, unenrollMfa, listMfaFactors } =
    useContext(AuthContext);
  const navigate = useNavigate();

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
  };
}
