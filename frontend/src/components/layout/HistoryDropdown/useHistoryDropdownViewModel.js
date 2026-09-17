import { useEffect, useState, useRef } from "react";
import {
  getRiskCalculationHistory,
  getRiskCalculation,
  deleteRiskCalculation,
} from "../../../services/api.js"

function useHistoryDropdownViewModel(accessToken, onLoadCalculation, onDeleteCalculation, setHistoryActivity) {
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const deletePending = useRef(false);
  const [result, setResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [viewError, setViewError] = useState("");
  const dropdownRef = useRef(null);
  const requestVersion = useRef(0);
  const currentResult = result?.accessToken === accessToken &&
    result?.retryCount === retryCount ? result : null;
  const history = currentResult?.history ?? [];
  const isLoading = Boolean(accessToken) && !currentResult;
  const error = currentResult?.error ?? "";
  const retryHistory = () => setRetryCount((count) => count + 1);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestVersion.current += 1;
    const fetchHistory = async () => {
      if (!accessToken) {
        return;
      }
      try {
        const data = await getRiskCalculationHistory(accessToken);
        if (!Array.isArray(data)) throw new Error("Invalid history response");
        if (!cancelled) {
          setResult({ accessToken, retryCount, history: data, error: "" });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load history:", error);
        setResult({ accessToken, retryCount, history: [],
          error: "Couldn't load history. Please try again." });
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
      requestVersion.current += 1;
    };
  }, [accessToken, retryCount]);

  const viewCalculation = async () => {
    if (isViewing || deletePending.current || !accessToken || !history.some((item) => item.riskcalc_id === selectedId)) return;
    const version = requestVersion.current;
    setIsViewing(true);
    setHistoryActivity?.("Loading calculation…");
    setViewError("");

    try {
      const data = await getRiskCalculation(
        accessToken,
        selectedId
      );
      if (version === requestVersion.current) {
        const index = history.findIndex((item) => item.riskcalc_id === selectedId);
        onLoadCalculation({
          ...data,
          calculationNumber: history.length - index,
          riskcalc_timestamp: history[index].riskcalc_timestamp,
        });
        setIsOpen(false);
      }

    } catch (error) {
      console.error("Failed to load calculation:", error);
      if (version === requestVersion.current) setViewError("Couldn't load this calculation. Please try again.");
    } finally {
      setIsViewing(false);
      setHistoryActivity?.("");
    }
  };

  const deleteCalculation = async (id) => {
    if (deletePending.current || isViewing || !accessToken || !history.some((item) => item.riskcalc_id === id)) return;
    const version = requestVersion.current;
    deletePending.current = true;
    setDeletingId(id);
    setHistoryActivity?.("Deleting calculation…");
    setDeleteError("");
    try {
      await deleteRiskCalculation(accessToken, id);
      if (version !== requestVersion.current) return;
      const remaining = history.filter((item) => item.riskcalc_id !== id);
      setResult({ accessToken, retryCount, history: remaining, error: "" });
      setSelectedId((current) => current === id ? "" : current);
      onDeleteCalculation?.(id, remaining);
      return true;
    } catch {
      if (version === requestVersion.current) setDeleteError("Couldn't delete this calculation. Please try again.");
    } finally {
      deletePending.current = false;
      setDeletingId(null);
      setHistoryActivity?.("");
    }
  };

  return {
    deletingId,
    deleteError,
    deleteCalculation,
    history,
    selectedId: history.some((item) => item.riskcalc_id === selectedId) ? selectedId : "",
    setSelectedId,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    retryHistory,
    isViewing,
    viewError,
    viewCalculation,
    dropdownRef,
  };
}

export default useHistoryDropdownViewModel;
