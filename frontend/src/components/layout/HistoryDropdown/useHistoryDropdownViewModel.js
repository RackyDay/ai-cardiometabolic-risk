import { useEffect, useState } from "react";
import {
  getRiskCalculationHistory,
  getRiskCalculation,
} from "../../../services/api.js"

function useHistoryDropdownViewModel(accessToken, onLoadCalculation) {
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!accessToken) {
        setSignedIn(false);
        setHistory([]);
        return;
      }

      let data;

      try {
        data = await getRiskCalculationHistory(accessToken);

        console.log("History:", data);

        setSignedIn(true);
        setHistory(data);
      } catch (error) {
        console.error("Failed to load history:", error);
        setSignedIn(false);
        return;
      }

      if (data.length > 0) {
        try {
          const latest = await getRiskCalculation(
            accessToken,
            data[0].riskcalc_id
          );

          console.log("Latest:", latest);

          onLoadCalculation(latest);
        } catch (error) {
          console.error(
            "Failed to load latest calculation:",
            error
          );
        }
      }
    };

    fetchHistory();
  }, [accessToken, onLoadCalculation]);

  const viewCalculation = async () => {
    if (!selectedId || !accessToken) return;

    try {
      const data = await getRiskCalculation(
        accessToken,
        selectedId
      );

      console.log("Fetched calculation:", data);
      onLoadCalculation(data);

    } catch (error) {
      console.error("Failed to load calculation:", error);
    }
  };

  return {
    history,
    selectedId,
    setSelectedId,
    isOpen,
    setIsOpen,
    signedIn,
    viewCalculation,
  };
}

export default useHistoryDropdownViewModel;