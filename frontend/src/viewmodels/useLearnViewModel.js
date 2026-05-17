function useLearnViewModel() {
  // Temporary logic for now.
  // Later, this can come from RiskContext or backend results.
  const relevantRiskFactors = {
    smoking: true,
    bloodPressure: false,
    stress: false,
    bmi: false,
  };

  const learningSections = [
    {
      id: "smoking",
      title: "Smoking",
      isVisible: relevantRiskFactors.smoking,
      articles: [
        {
          id: 1,
          title: "How does smoking affect cardiovascular health?",
          url: "#",
        },
        {
          id: 2,
          title: "What happens to your heart when you quit smoking?",
          url: "#",
        },
        {
          id: 3,
          title: "How does second-hand smoke affect heart health?",
          url: "#",
        },
        {
          id: 4,
          title: "Why does smoking increase risk?",
          url: "#",
        },
      ],
    },
  ];

  const visibleSections = learningSections.filter((section) => section.isVisible);

  return {
    visibleSections,
  };
}

export default useLearnViewModel;