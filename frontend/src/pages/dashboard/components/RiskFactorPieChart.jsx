import { useLayoutEffect, useRef, useState } from "react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";

import "./RiskFactorPieChart.css";
import { getRiskFactorColor } from "../riskFactorColors";


/* =========================================================
   Slice label geometry

   Labels sit outside the donut, connected to their slice by
   a short leader line, so each label clearly points back to
   the section of the chart it describes.
========================================================= */

const SLICE_LABEL_LINE_GAP = 10;
const SLICE_LABEL_TEXT_GAP = 16;
const SLICE_LABEL_MAX_CHARS_PER_LINE = 16;
const SLICE_LABEL_MIN_GAP = 6;
const OTHERS_THRESHOLD_PERCENT = 5;

// Groups risk-raising factors under the threshold into a single "Other
// factors" slice, so a handful of near-invisible slivers don't crowd the
// chart with labels. Only kicks in with 2+ small factors - grouping just
// one wouldn't declutter anything, only hide its name for no reason.
// feature is left null: it has no single row in the breakdown list to
// highlight, and getRiskFactorColor()/Cell keys already fall back
// sensibly for an unknown feature.
function aggregateSmallSlices(factors) {
  const small = factors.filter(
    (factor) => factor.value > 0 && factor.value < OTHERS_THRESHOLD_PERCENT
  );
  if (small.length <= 1) return factors;

  const smallFeatures = new Set(small.map((factor) => factor.feature));
  const kept = factors.filter((factor) => !smallFeatures.has(factor.feature));
  const othersValue = small.reduce((sum, factor) => sum + factor.value, 0);

  return [
    ...kept,
    {
      feature: null,
      name: "Other factors",
      value: othersValue,
      raisesRisk: true,
      members: small,
    },
  ];
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((-angleDeg) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

// Wraps a factor's full name (e.g. "Blood pressure medication status")
// onto a few short lines instead of one long line running off the chart.
function wrapSliceLabel(text, maxCharsPerLine = SLICE_LABEL_MAX_CHARS_PER_LINE) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

// getBBox() isn't implemented in jsdom (used by the component's tests),
// and may briefly fail on a real browser before first layout - fall back
// to an estimate from the label's line count in either case.
function measureLabelHeight(labelEl) {
  try {
    const height = labelEl.getBBox().height;
    if (height > 0) return height;
  } catch {
    // fall through to the estimate below
  }
  return (Number(labelEl.dataset.lines) || 1) * 12;
}

// Pushes labels on the same side of the chart apart vertically so two
// slices with adjacent angles don't render label text on top of each
// other. Labels are nudged down in natural-position order.
//
// `y` is each label's vertical CENTER (it's positioned with
// dominantBaseline="central"), so two labels clear each other once the
// gap between their centers is at least half of each one's height.
function declutterSliceLabels(positions) {
  const bySide = { left: [], right: [] };
  positions.forEach((p) => bySide[p.side]?.push(p));

  const offsets = {};
  for (const side of Object.values(bySide)) {
    side.sort((a, b) => a.y - b.y);
    for (let i = 1; i < side.length; i++) {
      const prev = side[i - 1];
      const cur = side[i];
      const prevBottom = prev.y + (offsets[prev.feature] ?? 0) + prev.height / 2;
      const curTop = cur.y + (offsets[cur.feature] ?? 0) - cur.height / 2;
      const minTop = prevBottom + SLICE_LABEL_MIN_GAP;
      if (curTop < minTop) {
        offsets[cur.feature] = (offsets[cur.feature] ?? 0) + (minTop - curTop);
      }
    }
  }
  return offsets;
}


/* =========================================================
   Risk factor descriptions
========================================================= */

export const RISK_FACTOR_DESCRIPTIONS = {
  "Body mass index":
    "A higher BMI can be associated with obesity, which can increase cardiovascular risk and place additional strain on the heart.",

  "Diastolic blood pressure":
    "Higher blood pressure increases the workload on the heart and can damage blood vessels over time, increasing cardiovascular risk.",

  "Systolic blood pressure":
    "Higher blood pressure increases the workload on the heart and is an important contributor to heart attack and stroke risk.",

  "Blood pressure medication status":
    "Blood pressure medication can indicate a history of hypertension. Well-controlled blood pressure can help reduce cardiovascular risk.",

  "Total cholesterol level":
    "Higher cholesterol levels can contribute to plaque buildup in arteries, increasing the risk of heart disease and stroke.",

  "Fasting blood glucose level":
    "Elevated blood glucose can be associated with insulin resistance and diabetes, conditions that can increase cardiovascular risk.",

  "Smoking status":
    "Smoking damages blood vessels, makes blood clots more likely and increases the risk of heart disease and stroke.",

  "Number of cigarettes smoked per day":
    "Greater tobacco exposure is associated with cardiovascular harm because smoking can damage blood vessels and promote plaque buildup.",

  "Age":
    "Cardiovascular risk generally increases with age as changes in blood vessels and the accumulation of other risk factors become more common.",

  "Gender":
    "Sex is included in many cardiovascular risk models because cardiovascular risk patterns differ between males and females.",

  "Hypertension diagnosis status":
    "A history of hypertension is an important cardiovascular risk factor because persistently high blood pressure can damage the heart and blood vessels.",

  "Resting heart rate":
    "Resting heart rate can provide information about cardiovascular health, although its contribution depends on the individual's overall health and other factors.",

  "Diabetes diagnosis status":
    "Diabetes can damage blood vessels and is associated with a higher risk of heart disease and stroke.",
};


/* =========================================================
   Tooltip
========================================================= */

function RiskFactorTooltip({
  active,
  payload,
}) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  const factor =
    payload[0].payload;

  const contribution =
    Number(factor.value);

  if (!(contribution > 0)) return null;

  const factorColor =
    getRiskFactorColor(
      factor.feature
    );


  return (
    <div className="risk-chart-tooltip">

      <div
        className="risk-chart-tooltip-title"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
        }}
      >

        {/* Larger colour label */}

        <span
          style={{
            width: "13px",
            height: "13px",
            minWidth: "13px",
            borderRadius: "4px",
            backgroundColor:
              factorColor,
            boxShadow:
              "0 0 0 2px #ffffff, 0 0 0 3px rgba(15, 23, 42, 0.12)",
          }}
        />


        <span>
          {factor.name}
        </span>

      </div>


      <div className="risk-chart-tooltip-divider" />


      <div className="risk-chart-tooltip-row">

        <span>
          Share of total contribution
        </span>

        <strong>
          {Number.isFinite(
            contribution
          )
            ? `${contribution.toFixed(
                2
              )}%`
            : "N/A"}
        </strong>

      </div>


      {typeof factor.raisesRisk ===
        "boolean" && (

        <div className="risk-chart-tooltip-row">

          <span>
            Impact
          </span>

          <strong
            className={
              factor.raisesRisk
                ? "risk-tooltip-positive"
                : "risk-tooltip-negative"
            }
          >

            {factor.raisesRisk
              ? "Raises risk"
              : "Lowers risk"}

          </strong>

        </div>
      )}


      {factor.members && (

        <>
          <div className="risk-chart-tooltip-divider" />

          <ul className="risk-chart-tooltip-members">

            {factor.members.map((member) => (

              <li key={member.feature}>

                <span>{member.name}</span>

                <strong>{Number(member.value).toFixed(2)}%</strong>

              </li>

            ))}

          </ul>
        </>
      )}

    </div>
  );
}


/* =========================================================
   Pie Chart
========================================================= */

function RiskFactorPieChart({
  data,
  hypotheticalData,
  isHypotheticalActive = false,
  onFactorHover,
}) {

  /*
   * activeIndex = factor currently
   * being hovered.
   */
  const [
    activeIndex,
    setActiveIndex,
  ] = useState(null);


  // Scopes the post-render label declutter pass (below) to just this
  // chart instance's own DOM.
  const donutWrapperRef = useRef(null);


  /* =======================================================
     Choose original or hypothetical data
  ======================================================= */

  const chartData = aggregateSmallSlices(
    isHypotheticalActive &&
    hypotheticalData &&
    hypotheticalData.length > 0
      ? hypotheticalData
      : data
  );


  /*
   * Slice labels are drawn at their natural (non-overlapping-unaware)
   * position first; this measures what actually got painted and nudges
   * any that collide apart, updating the DOM directly rather than
   * through React state.
   *
   * It can't just run once after this component's own render: Recharts'
   * ResponsiveContainer measures itself asynchronously, so the real
   * labels often don't exist in the DOM yet on this component's first
   * paint, and get (re)created independently whenever the container
   * resizes or chartData changes. A MutationObserver reacts to Recharts
   * actually inserting/replacing those nodes, whenever that happens,
   * instead of guessing when to re-run from our own render cycle. It
   * only watches for added/removed nodes, so this pass's own attribute
   * writes below don't re-trigger it.
   */
  useLayoutEffect(() => {
    const container = donutWrapperRef.current;
    if (!container) return undefined;

    const declutter = () => {
      const labels = [
        ...container.querySelectorAll(".risk-chart-slice-label"),
      ];
      if (labels.length === 0) return;

      const positions = labels.map((label) => ({
        feature: label.dataset.feature,
        side: label.dataset.side,
        y: Number(label.dataset.naturalY),
        height: measureLabelHeight(label),
      }));

      const offsets = declutterSliceLabels(positions);

      labels.forEach((label) => {
        const offset = offsets[label.dataset.feature] ?? 0;
        const naturalY = Number(label.dataset.naturalY);
        label.setAttribute("y", String(naturalY + offset));

        const line = container.querySelector(
          `.risk-chart-slice-line[data-feature="${CSS.escape(label.dataset.feature)}"]`
        );
        if (!line) return;

        const [edge, bend] = line.getAttribute("points").trim().split(" ");
        const [bendX, bendY] = bend.split(",").map(Number);
        line.setAttribute("points", `${edge} ${bend} ${bendX},${bendY + offset}`);
      });
    };

    declutter();

    const cleanups = [];

    if (typeof MutationObserver !== "undefined") {
      const mutationObserver = new MutationObserver(declutter);
      mutationObserver.observe(container, { childList: true, subtree: true });
      cleanups.push(() => mutationObserver.disconnect());
    }

    // Not available in the test environment (jsdom) - the initial
    // declutter() call above still runs there.
    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(declutter);
      resizeObserver.observe(container);
      cleanups.push(() => resizeObserver.disconnect());
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);


  if (
    !chartData ||
    chartData.length === 0
  ) {
    return (
      <p className="risk-factors-empty">
        Submit your health information
        to see your risk factors.
      </p>
    );
  }


  if (!chartData.some((factor) => factor.value > 0)) {
    return (
      <div className="risk-chart-container">
        <p className="risk-factors-empty" role="status">
          No risk-raising effects among the displayed factors
          {isHypotheticalActive ? " in this what-if scenario" : " in this assessment"}.
          {" "}Risk-lowering factors remain in the list. This does not mean the overall risk is zero.
        </p>
      </div>
    );
  }

  /* =======================================================
     Determine highlighted factor
  ======================================================= */

  // Highlight only the slice currently under the pointer; clicks do not pin it.
  const highlightedIndex = chartData[activeIndex]?.value > 0
    ? activeIndex
    : null;


  const highlightedFactor =
    highlightedIndex !== null
      ? chartData[
          highlightedIndex
        ]
      : null;

  // What the donut's center shows: the hovered slice's own share while
  // hovering, or the combined share of every risk-raising factor at rest -
  // so the number there isn't just static decoration and always reflects
  // whatever the chart is currently highlighting.
  const totalRaisingShare = chartData.reduce(
    (sum, factor) => sum + (Number(factor.value) || 0),
    0
  );

  const centerValue = highlightedFactor
    ? Number(highlightedFactor.value)
    : totalRaisingShare;


  /* =======================================================
     Hover handlers
  ======================================================= */

  const handleMouseEnter = (
    _,
    index
  ) => {
    setActiveIndex(index);

    const factor =
      chartData[index];

    onFactorHover?.(
      factor?.feature ?? null
    );
  };


  const handleMouseLeave = () => {
    setActiveIndex(null);
    onFactorHover?.(null);
  };


  /* =======================================================
     Slice labels

     Every slice with a non-zero share gets its own label
     outside the donut, joined to that slice by a leader line
     coloured to match it - so it's unambiguous which section
     of the chart each label belongs to.
  ======================================================= */

  const renderSliceLabelLine = ({ cx, cy, midAngle, outerRadius, index }) => {
    const entry = chartData[index];
    if (!entry || !(entry.value > 0)) return null;

    const start = polarToCartesian(cx, cy, outerRadius, midAngle);
    const bend = polarToCartesian(cx, cy, outerRadius + SLICE_LABEL_LINE_GAP, midAngle);

    return (
      <polyline
        className="risk-chart-slice-line"
        data-feature={entry.feature}
        points={`${start.x},${start.y} ${bend.x},${bend.y}`}
        stroke={getRiskFactorColor(entry.feature)}
        strokeWidth={1.5}
        fill="none"
      />
    );
  };


  const renderSliceLabel = ({ cx, cy, midAngle, outerRadius, index }) => {
    const entry = chartData[index];
    if (!entry || !(entry.value > 0)) return null;

    const point = polarToCartesian(
      cx, cy, outerRadius + SLICE_LABEL_LINE_GAP + SLICE_LABEL_TEXT_GAP, midAngle
    );
    const textAnchor = point.x >= cx ? "start" : "end";
    const lines = wrapSliceLabel(entry.name);
    const firstLineOffset = -((lines.length - 1) * 6);

    return (
      <text
        x={point.x}
        y={point.y}
        data-feature={entry.feature}
        data-side={point.x >= cx ? "right" : "left"}
        data-natural-y={point.y}
        data-lines={lines.length}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="risk-chart-slice-label"
      >
        {lines.map((line, i) => (
          <tspan key={line} x={point.x} dy={i === 0 ? firstLineOffset : 12}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };


  /* =======================================================
     Render
  ======================================================= */

  return (
    <div className="risk-chart-container" onMouseLeave={handleMouseLeave}>

      <div className="risk-donut-section">


        {/* =================================================
            Assessment type
        ================================================== */}

        <div
          className={`risk-chart-mode ${
            isHypotheticalActive
              ? "risk-chart-mode-hypothetical"
              : "risk-chart-mode-original"
          }`}
        >

          <span className="risk-chart-mode-dot" />

          {isHypotheticalActive
            ? "What-if scenario"
            : "Original assessment"}

        </div>


        {/* =================================================
            Help / selected-factor text
        ================================================== */}

        <div className="risk-chart-hint">

          {highlightedFactor
            ? highlightedFactor.name

            : isHypotheticalActive
            ? "Hover over a factor to explore its what-if contribution."

            : "Hover over a factor to see its contribution."}

        </div>


        {/* =================================================
            Donut
        ================================================== */}

        <div className="risk-donut-wrapper" ref={donutWrapperRef}>

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <PieChart>

              <Pie
                /*
                 * Recharts silently drops the whole custom label layer
                 * for the duration of its enter/update animation when
                 * the slice count or keys change between renders (e.g.
                 * switching the changeable/fixed factor tab) - it never
                 * recovers once that happens. Disabling the animation
                 * sidesteps it entirely.
                 */
                isAnimationActive={false}

                data={chartData}

                dataKey="value"

                nameKey="name"

                cx="50%"

                cy="50%"

                innerRadius="44%"

                outerRadius="68%"

                paddingAngle={2}

                stroke="#ffffff"

                strokeWidth={2}

                label={renderSliceLabel}

                labelLine={renderSliceLabelLine}

                activeIndex={
                  highlightedIndex ??
                  -1
                }


                /*
                 * Recharts Sector handles the
                 * expanded segment safely.
                 *
                 * This also preserves the earlier
                 * fix for large slices becoming
                 * football-shaped.
                 */
                activeShape={(
                  props
                ) => (

                  <Sector
                    {...props}

                    outerRadius={
                      props.outerRadius +
                      7
                    }

                    stroke="#ffffff"

                    strokeWidth={3}

                    style={{
                      filter:
                        "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.16))",
                    }}
                  />

                )}


                onMouseEnter={
                  handleMouseEnter
                }

                onMouseLeave={
                  handleMouseLeave
                }

              >

                {/* Keep the shared factor colors, muted until hovered. */}
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.feature ?? entry.name}`}
                    fill={getRiskFactorColor(entry.feature)}
                    opacity={highlightedIndex === index ? 1 : 0.65}
                    style={{ cursor: "pointer", transition: "opacity 0.18s ease" }}
                  />
                ))}

              </Pie>


              {/* =================================================
                  Tooltip
              ================================================== */}

              <Tooltip
                active={highlightedIndex !== null}
                content={
                  <RiskFactorTooltip />
                }

                wrapperStyle={{
                  zIndex: 50,

                  pointerEvents:
                    "none",
                }}
              />

            </PieChart>

          </ResponsiveContainer>


          {/* =================================================
              Centre text
          ================================================== */}

          <div className="risk-chart-center-text">

            <strong className="risk-chart-center-value">
              {centerValue.toFixed(1)}%
            </strong>

            <span>
              {highlightedFactor
                ? "of total contribution"
                : "of contribution raises risk"}
            </span>

          </div>

        </div>


        {/* =================================================
            Selected / hovered factor details
        ================================================== */}

        {highlightedFactor && (

          <div className="risk-chart-selected-factor">

            <div
              className="risk-chart-selected-factor-title"

              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >

              {/* Stronger colour swatch */}

              <span
                style={{
                  width: "14px",
                  height: "14px",
                  minWidth: "14px",

                  borderRadius:
                    "4px",

                  backgroundColor:
                    getRiskFactorColor(
                      highlightedFactor.feature
                    ),

                  boxShadow:
                    "0 0 0 2px #ffffff, 0 0 0 3px rgba(15, 23, 42, 0.12)",
                }}
              />

              {highlightedFactor.name}

            </div>


            <div className="risk-chart-selected-factor-row">

              <span>
                Share of total contribution
              </span>

              <strong>
                {Number(
                  highlightedFactor.value
                ).toFixed(2)}
                %
              </strong>

            </div>


            {typeof highlightedFactor.raisesRisk ===
              "boolean" && (

              <div className="risk-chart-selected-factor-row">

                <span>
                  Impact
                </span>

                <strong
                  className={
                    highlightedFactor.raisesRisk
                      ? "risk-tooltip-positive"
                      : "risk-tooltip-negative"
                  }
                >

                  {highlightedFactor.raisesRisk
                    ? "Raises risk"
                    : "Lowers risk"}

                </strong>

              </div>

            )}


            {highlightedFactor.members && (

              <ul className="risk-chart-tooltip-members risk-chart-selected-factor-members">

                {highlightedFactor.members.map((member) => (

                  <li key={member.feature}>

                    <span>{member.name}</span>

                    <strong>{Number(member.value).toFixed(2)}%</strong>

                  </li>

                ))}

              </ul>

            )}

          </div>

        )}

      </div>

    </div>
  );
}


export default RiskFactorPieChart;
