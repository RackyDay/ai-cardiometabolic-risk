import { useContext, useEffect, useMemo, useState } from "react";
import { RiskContext } from "../../context/RiskContext";
import { AuthContext } from "../../context/AuthContext";
import { UnitContext } from "../../context/UnitContext";
import { buildPersonalisedTopics } from "./learnPersonalisedTopics";
import { getPreventionRecommendations } from "../../services/myHealthfinderApi";

const MAX_RECOMMENDATIONS = 6;
const GENERAL_REASON = "Recommended by MyHealthfinder for people of your age and sex.";
// MyHealthfinder accepts only male/female; "Rather not say" gets topic-only results.
const SEX_BY_GENDER = { M: "male", F: "female" };

function usePersonalisedEducationViewModel() {
  // Read only completed assessments: a history selection, or the snapshot of
  // the last scored inputs. riskInputs can be an unfinished draft.
  const { selectedCalculation, assessedInputs, topContributors } = useContext(RiskContext) ?? {};
  const { isAuthenticated = false } = useContext(AuthContext) ?? {};
  const { clinicalUnit } = useContext(UnitContext);
  // Personalised education is for signed-in accounts only, like the
  // dashboard's Insights and risk trend cards; guests get no topics.
  const inputs = isAuthenticated ? selectedCalculation?.inputs ?? assessedInputs : null;
  const contributors = selectedCalculation?.top_contributors ?? topContributors;

  const topics = useMemo(
    () => buildPersonalisedTopics(inputs, contributors, clinicalUnit),
    [inputs, contributors, clinicalUnit],
  );
  // Flagged risk factors become MyHealthfinder topic IDs; age, sex and smoking
  // status add general recommendations. Serialised so the request only
  // repeats when one of these changes, not when a unit or reason does.
  const requestKey = useMemo(() => {
    if (!topics) return "";
    const age = Number(inputs.age);
    const sex = SEX_BY_GENDER[inputs.gender];
    const demographics = sex && Number.isInteger(age) && age > 0
      ? { age, sex, tobaccoUse: inputs.currentSmoker === true }
      : {};
    return JSON.stringify({ topicIds: topics.map((topic) => topic.topicId), ...demographics });
  }, [topics, inputs]);
  const [response, setResponse] = useState({ requestKey: "", status: "loading", recommendations: [] });

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    getPreventionRecommendations({ ...JSON.parse(requestKey), signal: controller.signal })
      .then((recommendations) => ({ status: recommendations.length ? "ready" : "empty", recommendations }))
      .catch(() => ({ status: "error", recommendations: [] }))
      .then((result) => {
        if (!controller.signal.aborted) setResponse({ requestKey, ...result });
      });
    return () => controller.abort();
  }, [requestKey]);

  const current = response.requestKey === requestKey ? response : { status: "loading", recommendations: [] };
  const reasonByTopic = new Map((topics ?? []).map((topic) => [topic.topicId, topic.reason]));
  return {
    isAuthenticated,
    hasAssessment: Boolean(topics),
    status: current.status,
    // Topic matches arrive first (in risk order), then general age/sex advice.
    recommendations: current.recommendations.slice(0, MAX_RECOMMENDATIONS).map((recommendation) => ({
      ...recommendation,
      reason: reasonByTopic.get(recommendation.topicId) ?? GENERAL_REASON,
    })),
  };
}

export default usePersonalisedEducationViewModel;
