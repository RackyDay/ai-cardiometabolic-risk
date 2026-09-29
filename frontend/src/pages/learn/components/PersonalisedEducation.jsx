// Reserved for future personalisation. Do not interpret RiskContext's live
// inputs here: they can contain an unfinished assessment draft.
function PersonalisedEducation() {
  return (
    <section className="learn-personalised" aria-labelledby="learn-personalised-title">
      <h2 id="learn-personalised-title" className="learn-section-title">
        Based on your assessment
      </h2>
      <p className="learn-empty-title">Your personalised learning space</p>
      <p className="learn-section-description">
        Personalised education will appear here when it is available. You can
        explore all the topics below, with or without an assessment.
      </p>
    </section>
  );
}

export default PersonalisedEducation;
