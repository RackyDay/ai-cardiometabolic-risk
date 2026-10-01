import { useContext, useEffect, useMemo, useState } from "react";
import { RiskContext } from "../../context/RiskContext";
import { UnitContext } from "../../context/UnitContext";
import { buildPersonalisedTopics } from "./learnPersonalisedTopics";
import { searchMedlinePlus } from "../../services/medlinePlusApi";

const loadingContent = { status: "loading", articles: [] };

function usePersonalisedEducationViewModel() {
  // Read only completed assessments: a history selection, or the snapshot of
  // the last scored inputs. riskInputs can be an unfinished draft.
  const { selectedCalculation, assessedInputs, topContributors } = useContext(RiskContext) ?? {};
  const { clinicalUnit } = useContext(UnitContext);
  const inputs = selectedCalculation?.inputs ?? assessedInputs;
  const contributors = selectedCalculation?.top_contributors ?? topContributors;

  const topics = useMemo(
    () => buildPersonalisedTopics(inputs, contributors, clinicalUnit),
    [inputs, contributors, clinicalUnit],
  );
  // Refetch only when the search terms change, not when a unit or reason does.
  const queryKey = topics ? topics.map((topic) => topic.searchTerm).join("\n") : "";
  const [response, setResponse] = useState({ queryKey: "", byTerm: {} });

  useEffect(() => {
    if (!queryKey) return undefined;
    const controller = new AbortController();
    // At most four personalised topics, so these are requested together.
    for (const searchTerm of queryKey.split("\n")) {
      searchMedlinePlus(searchTerm, { limit: 1, signal: controller.signal })
        .then((articles) => ({ status: articles.length ? "ready" : "empty", articles }))
        .catch(() => ({ status: "error", articles: [] }))
        .then((content) => {
          if (controller.signal.aborted) return;
          setResponse((previous) => ({
            queryKey,
            byTerm: { ...(previous.queryKey === queryKey ? previous.byTerm : {}), [searchTerm]: content },
          }));
        });
    }
    return () => controller.abort();
  }, [queryKey]);

  const byTerm = response.queryKey === queryKey ? response.byTerm : {};
  return {
    hasAssessment: Boolean(topics),
    topics: (topics ?? []).map((topic) => ({ ...topic, content: byTerm[topic.searchTerm] ?? loadingContent })),
  };
}

export default usePersonalisedEducationViewModel;
