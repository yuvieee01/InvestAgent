"use client";

import { useState, useCallback } from "react";
import CompanySearch from "./components/CompanySearch";
import ResearchTimeline from "./components/ResearchTimeline";
import DecisionCard from "./components/DecisionCard";

interface TimelineStep {
  node: string;
  label: string;
  status: "pending" | "active" | "completed";
  timestamp?: string;
}

interface ResearchResult {
  company: string;
  ticker?: string;
  fullName?: string;
  sector?: string;
  decision: "INVEST" | "PASS" | "MONITOR";
  confidence: number;
  reasoning: string;
  bullishFactors: string[];
  bearishFactors: string[];
}

const PIPELINE_STEPS = [
  { node: "resolveCompany", label: "🔍 Resolving company..." },
  { node: "researchFinancials", label: "📊 Researching financials..." },
  { node: "researchNews", label: "📰 Fetching news..." },
  { node: "researchCompetitors", label: "🏁 Analyzing competitors..." },
  { node: "researchIndustry", label: "🌍 Researching industry trends..." },
  { node: "analyzeAll", label: "🧠 Synthesizing analysis..." },
  { node: "makeDecision", label: "⚖️ Making investment decision..." },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runResearch = useCallback(
    async (company: string) => {
      setIsLoading(true);
      setResult(null);
      setError(null);

      // Initialize timeline with pending steps
      setTimelineSteps(
        PIPELINE_STEPS.map((step) => ({
          ...step,
          status: "pending" as const,
        }))
      );

      // Set first step as active
      setTimelineSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "active" as const } : s))
      );

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Research failed");
        }

        // Process SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        const completedNodes = new Set<string>();
        let finalResult: ResearchResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          let eventType = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (eventType === "node_complete") {
                  const nodeName = data.node;
                  completedNodes.add(nodeName);

                  setTimelineSteps((prev) =>
                    prev.map((step) => {
                      if (completedNodes.has(step.node)) {
                        return {
                          ...step,
                          status: "completed" as const,
                          timestamp: new Date().toLocaleTimeString(),
                        };
                      }
                      // Find the next pending step and mark it active
                      const allCompleted = prev
                        .filter((s) => completedNodes.has(s.node))
                        .map((s) => s.node);
                      const nextPendingIdx = prev.findIndex(
                        (s) =>
                          !allCompleted.includes(s.node) &&
                          s.node !== step.node
                      );
                      if (
                        nextPendingIdx !== -1 &&
                        prev[nextPendingIdx].node === step.node
                      ) {
                        return { ...step, status: "active" as const };
                      }
                      return step;
                    })
                  );

                  // If makeDecision completed, extract the result from the node output
                  if (nodeName === "makeDecision" && data.data) {
                    const nodeData = data.data;
                    finalResult = {
                      company,
                      ticker: nodeData.ticker,
                      fullName: nodeData.fullName,
                      sector: nodeData.sector,
                      decision: nodeData.decision,
                      confidence: nodeData.confidence,
                      reasoning: nodeData.reasoning,
                      bullishFactors: nodeData.bullishFactors || [],
                      bearishFactors: nodeData.bearishFactors || [],
                    };
                  }
                } else if (eventType === "result") {
                  finalResult = {
                    company,
                    ticker: data.ticker,
                    fullName: data.fullName,
                    sector: data.sector,
                    decision: data.decision,
                    confidence: data.confidence,
                    reasoning: data.reasoning,
                    bullishFactors: data.bullishFactors || [],
                    bearishFactors: data.bearishFactors || [],
                  };
                } else if (eventType === "error") {
                  throw new Error(data.message);
                }
              } catch (parseErr) {
                // Skip malformed JSON lines
                if (parseErr instanceof Error && parseErr.message !== dataStr) {
                  // Only throw if it's not a JSON parse error
                  if (
                    !parseErr.message.includes("JSON") &&
                    !parseErr.message.includes("Unexpected")
                  ) {
                    throw parseErr;
                  }
                }
              }
            }
          }
        }

        // Set all steps to completed
        setTimelineSteps((prev) =>
          prev.map((step) => ({
            ...step,
            status: "completed" as const,
            timestamp: step.timestamp || new Date().toLocaleTimeString(),
          }))
        );

        if (finalResult) {
          setResult(finalResult);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setTimelineSteps([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSearch = useCallback(
    (company: string) => {
      runResearch(company);
    },
    [runResearch]
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">📊</div>
          <h1 className="app-title">InvestAgent</h1>
        </div>
        <p className="app-subtitle">
          AI-powered investment research. Analyze any public company with
          real-time data, competitive intelligence, and institutional-grade
          analysis.
        </p>
      </header>

      {/* Search */}
      <CompanySearch
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Error */}
      {error && (
        <div className="error-banner" id="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Timeline */}
      <ResearchTimeline steps={timelineSteps} isActive={isLoading} />

      {/* Result */}
      {result && (
        <DecisionCard
          company={result.fullName || result.company}
          ticker={result.ticker}
          sector={result.sector}
          decision={result.decision}
          confidence={result.confidence}
          reasoning={result.reasoning}
          bullishFactors={result.bullishFactors}
          bearishFactors={result.bearishFactors}
        />
      )}
    </div>
  );
}
