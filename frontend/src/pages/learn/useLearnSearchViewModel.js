import { useCallback, useEffect, useRef, useState } from "react";
import { searchMedlinePlus } from "../../services/medlinePlusApi";

const SEARCH_LIMIT = 5;
const idleSearch = { status: "idle", term: "", articles: [], error: "" };

// Keyword search for independent browsing. Searches run on submit only, and a
// newer search (or leaving the page) cancels the one still in flight.
function useLearnSearchViewModel() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(idleSearch);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submitSearch = useCallback(async (event) => {
    event?.preventDefault();
    controllerRef.current?.abort();
    const term = query.trim().replace(/\s+/g, " ");
    if (!term) {
      setSearch({ ...idleSearch, status: "error", error: "Enter a search term." });
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setSearch({ ...idleSearch, status: "loading", term });
    try {
      const articles = await searchMedlinePlus(term, { limit: SEARCH_LIMIT, signal: controller.signal });
      if (!controller.signal.aborted) setSearch({ ...idleSearch, status: articles.length ? "ready" : "empty", term, articles });
    } catch (error) {
      if (!controller.signal.aborted) setSearch({ ...idleSearch, status: "error", term, error: error.message });
    }
  }, [query]);

  const clearSearch = useCallback(() => {
    controllerRef.current?.abort();
    setQuery("");
    setSearch(idleSearch);
  }, []);

  return { query, setQuery, search, submitSearch, clearSearch };
}

export default useLearnSearchViewModel;
