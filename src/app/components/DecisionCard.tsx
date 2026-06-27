"use client";

import FactorsGrid from "./FactorsGrid";

interface DecisionCardProps {
  company: string;
  ticker?: string;
  sector?: string;
  decision: "INVEST" | "PASS" | "MONITOR";
  confidence: number;
  reasoning: string;
  bullishFactors: string[];
  bearishFactors: string[];
}

export default function DecisionCard({
  company,
  ticker,
  sector,
  decision,
  confidence,
  reasoning,
  bullishFactors,
  bearishFactors,
}: DecisionCardProps) {
  const circumference = 2 * Math.PI * 34; // radius = 34
  const offset = circumference - (confidence / 100) * circumference;

  const decisionClass = decision.toLowerCase();

  const decisionColors: Record<string, string> = {
    invest: "var(--color-invest)",
    pass: "var(--color-pass)",
    monitor: "var(--color-monitor)",
  };

  return (
    <div className="decision-card" id="decision-card">
      <div className="decision-header">
        <div className="decision-company">
          <h2 className="decision-company-name">{company}</h2>
          <span className="decision-company-meta">
            {ticker && `${ticker}`}
            {ticker && sector && " · "}
            {sector && `${sector}`}
          </span>
        </div>

        <div className="decision-badge">
          <span className={`decision-verdict ${decisionClass}`}>
            {decision}
          </span>

          <div className="confidence-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                className="confidence-ring-bg"
                cx="40"
                cy="40"
                r="34"
              />
              <circle
                className={`confidence-ring-fill ${decisionClass}`}
                cx="40"
                cy="40"
                r="34"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <span
              className="confidence-value"
              style={{ color: decisionColors[decisionClass] }}
            >
              {confidence}
            </span>
          </div>
          <span className="confidence-label">Confidence</span>
        </div>
      </div>

      <div className="decision-body">
        <p className="decision-reasoning">{reasoning}</p>
      </div>

      <FactorsGrid
        bullishFactors={bullishFactors}
        bearishFactors={bearishFactors}
      />
    </div>
  );
}
