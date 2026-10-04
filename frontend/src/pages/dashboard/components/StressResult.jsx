import "./StressResult.css";

const bands = [
  { min: 0, max: 13, label: "Low" },
  { min: 14, max: 26, label: "Moderate" },
  { min: 27, max: 40, label: "High" },
];

export default function StressResult({ score }) {
  return (
    <section className="stress-dashboard-result" aria-label="Perceived stress result">
      <h3>PSS-10 stress score</h3>
      <p className="stress-dashboard-score"><strong>{score} / 40</strong><span>Over the past month</span></p>
      <h4>Common informal score ranges</h4>
      <table>
        <thead><tr><th scope="col">Score</th><th scope="col">Perceived stress</th></tr></thead>
        <tbody>{bands.map(({ min, max, label }) => {
          const current = score >= min && score <= max;
          return <tr key={min} className={current ? "stress-band-current" : undefined}>
            <td>{min}–{max}</td><td>{label}{current && <strong> · Your range</strong>}</td>
          </tr>;
        })}</tbody>
      </table>
      <p>Higher scores indicate greater perceived stress. These bands are informal guides, not validated clinical cutoffs. The PSS-10 does not diagnose a condition.</p>
      <h4>How stress relates to heart health</h4>
      <p>Ongoing stress may contribute to higher blood pressure and disrupt sleep, activity and eating habits. These pathways can affect heart disease risk over time. This score reflects perceived stress, not your probability of heart disease, and does not change your calculated cardiovascular risk score.</p>
      <div className="stress-result-sources">
        <a href="https://www.phenxtoolkit.org/protocols/view/180801" target="_blank" rel="noreferrer">PSS interpretation guidance</a>
        <a href="https://discovery.ucl.ac.uk/10110957/7/Wiriyakijja_10110957_Thesis_redacted.pdf" target="_blank" rel="noreferrer">Example use of informal bands</a>
        <a href="https://www.heart.org/en/healthy-living/healthy-lifestyle/stress-management/stress-and-heart-health" target="_blank" rel="noreferrer">Stress and heart health (AHA)</a>
      </div>
    </section>
  );
}
