"use client";

interface TimelineStep {
  node: string;
  label: string;
  status: "pending" | "active" | "completed";
  timestamp?: string;
}

interface ResearchTimelineProps {
  steps: TimelineStep[];
  isActive: boolean;
}

export default function ResearchTimeline({
  steps,
  isActive,
}: ResearchTimelineProps) {
  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="timeline-container">
      <h3 className="timeline-title">Research Pipeline</h3>
      <div className="timeline">
        {steps.map((step, index) => (
          <div
            key={step.node}
            className={`timeline-item ${step.status}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="timeline-dot" />
            <div className="timeline-label">{step.label}</div>
            {step.timestamp && (
              <div className="timeline-time">{step.timestamp}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
