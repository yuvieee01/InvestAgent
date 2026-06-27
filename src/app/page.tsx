"use client";

import { useState, useCallback, useEffect } from "react";
import CompanySearch from "./components/CompanySearch";
import ResearchTimeline from "./components/ResearchTimeline";
import DecisionCard from "./components/DecisionCard";
import ApiKeyModal from "./components/ApiKeyModal";

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

const FREE_LIMIT = 3;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [userKeys, setUserKeys] = useState<{
    google: string;
    tavily: string;
  } | null>(null);
  const [pendingCompany, setPendingCompany] = useState<string | null>(null);

  // Load search count and keys from localStorage
  useEffect(() => {
    const savedCount = localStorage.getItem("investAgent_searchCount");
    if (savedCount) setSearchCount(parseInt(savedCount, 10));

    const savedKeys = localStorage.getItem("investAgent_userKeys");
    if (savedKeys) {
      try {
        setUserKeys(JSON.parse(savedKeys));
      } catch {
        // ignore invalid JSON
      }
    }
  }, []);

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
        const currentCount = searchCount;

        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-search-count": currentCount.toString(),
          },
          body: JSON.stringify({
            company,
            userGoogleKey:
              currentCount >= FREE_LIMIT ? userKeys?.google : undefined,
            userTavilyKey:
              currentCount >= FREE_LIMIT ? userKeys?.tavily : undefined,
          }),
        });

        if (response.status === 402) {
          // Need API keys
          setPendingCompany(company);
          setShowKeyModal(true);
          setIsLoading(false);
          setTimelineSteps([]);
          return;
        }

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

        // Increment search count
        const newCount = currentCount + 1;
        setSearchCount(newCount);
        localStorage.setItem("investAgent_searchCount", newCount.toString());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setTimelineSteps([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchCount, userKeys]
  );

  const handleSearch = useCallback(
    (company: string) => {
      // Check if keys are needed
      if (searchCount >= FREE_LIMIT && !userKeys) {
        setPendingCompany(company);
        setShowKeyModal(true);
        return;
      }
      runResearch(company);
    },
    [searchCount, userKeys, runResearch]
  );

  const handleKeySave = useCallback(
    (googleKey: string, tavilyKey: string) => {
      const keys = { google: googleKey, tavily: tavilyKey };
      setUserKeys(keys);
      localStorage.setItem("investAgent_userKeys", JSON.stringify(keys));
      setShowKeyModal(false);

      // If there was a pending search, run it now
      if (pendingCompany) {
        // Small delay to allow state to update
        setTimeout(() => {
          runResearch(pendingCompany);
          setPendingCompany(null);
        }, 100);
      }
    },
    [pendingCompany, runResearch]
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
        searchCount={searchCount}
        freeLimit={FREE_LIMIT}
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

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal
          onSave={handleKeySave}
          onCancel={() => {
            setShowKeyModal(false);
            setPendingCompany(null);
          }}
        />
      )}
    </div>
  );
}
