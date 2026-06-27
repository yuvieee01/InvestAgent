"use client";

interface FactorsGridProps {
  bullishFactors: string[];
  bearishFactors: string[];
}

export default function FactorsGrid({
  bullishFactors,
  bearishFactors,
}: FactorsGridProps) {
  return (
    <div className="factors-grid">
      <div className="factors-column">
        <h4 className="factors-title bullish">
          <span>▲</span> Bullish Factors
        </h4>
        <ul className="factors-list">
          {bullishFactors.map((factor, index) => (
            <li key={index} className="factor-item">
              <span className="factor-icon bullish">✦</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="factors-column">
        <h4 className="factors-title bearish">
          <span>▼</span> Bearish Factors
        </h4>
        <ul className="factors-list">
          {bearishFactors.map((factor, index) => (
            <li key={index} className="factor-item">
              <span className="factor-icon bearish">✦</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
