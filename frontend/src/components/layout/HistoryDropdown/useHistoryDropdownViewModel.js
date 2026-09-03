import { useEffect, useState } from "react";

function useHistoryDropdownViewModel(onLoadCalculation) {
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/risk-calculations", {
          credentials: "include",
        });

        if (!response.ok) {
          setSignedIn(false);
          return;
        }

        const data = await response.json();

        setSignedIn(true);
        setHistory(data);
      } catch {
        setSignedIn(false);
      }
    };

    fetchHistory();
  }, []);

  const viewCalculation = async () => {
    if (!selectedId) return;

    const response = await fetch(
      `/api/risk-calculations/${selectedId}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    onLoadCalculation(data);
  };

  return {
    history,
    selectedId,
    setSelectedId,
    signedIn,
    viewCalculation,
  };
}

export default useHistoryDropdownViewModel;