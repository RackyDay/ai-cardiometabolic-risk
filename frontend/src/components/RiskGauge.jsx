import "./RiskGauge.css";

function RiskGauge({ score }) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = (score / 100) * circumference;

  return (
    <div className="gauge-wrapper">
      <svg width={radius * 2} height={radius * 2} className="gauge-svg">
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#f97316"
          strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="central"
          className="gauge-text"
        >
          {score}%
        </text>
      </svg>

      <div className="simulate-dropdown">
        <span>Simulate how different factors affect this score</span>
        <span className="dropdown-arrow">▾</span>
      </div>
    </div>
  );
}

export default RiskGauge;