import { useCallback, useEffect, useRef, useState } from "react";

function useLearnViewModel() {
  const cardScrollRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
          title: "Why does smoking increase heart attack risk?",
          url: "#",
        },
      ],
    },
  ];

  const visibleSections = learningSections.filter((section) => section.isVisible);

  const updateScrollButtons = useCallback(() => {
    const container = cardScrollRef.current;

    if (!container) return;

    const tolerance = 2;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    setCanScrollLeft(container.scrollLeft > tolerance);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - tolerance);
  }, []);

  const scrollCardsLeft = () => {
    cardScrollRef.current?.scrollBy({
      left: -260,
      behavior: "smooth",
    });
  };

  const scrollCardsRight = () => {
    cardScrollRef.current?.scrollBy({
      left: 260,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    requestAnimationFrame(updateScrollButtons);

    window.addEventListener("resize", updateScrollButtons);

    return () => {
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  return {
    visibleSections,
    cardScrollRef,
    canScrollLeft,
    canScrollRight,
    scrollCardsLeft,
    scrollCardsRight,
    updateScrollButtons,
  };
}

export default useLearnViewModel;