import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export function useSettingsViewModel() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Account configuration only makes sense while logged in - bounce anyone
  // who lands here directly (typed URL, stale link) back to Welcome.
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return { user };
}
