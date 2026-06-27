import { AgentState } from "../state";
import { createLLM } from "../../llm";

/**
 * makeDecision node
 * Outputs the final INVEST / PASS / MONITOR verdict with:
 * - 0–100 confidence score
 * - Bullish factors
 * - Bearish factors
 * - Reasoning paragraph
 */
export async function makeDecision(
  state: AgentState
): Promise<Partial<AgentState>> {
  const llm = createLLM(state.userGoogleKey);

  const fullName = state.fullName || state.company;
  const ticker = state.ticker || state.company;

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a portfolio manager making a final investment decision. Based on the analysis provided, output your decision.

You MUST respond ONLY in this exact JSON format with no other text:
{
  "decision": "INVEST" | "PASS" | "MONITOR",
  "confidence": <number 0-100>,
  "reasoning": "<1-2 paragraph explanation of your decision>",
  "bullishFactors": ["factor1", "factor2", "factor3"],
  "bearishFactors": ["factor1", "factor2", "factor3"]
}

Decision guidelines:
- INVEST: Strong fundamentals, positive momentum, favorable risk/reward (confidence typically 60+)
- MONITOR: Mixed signals, needs more time/data, some potential (confidence typically 35-59)
- PASS: Significant risks, poor fundamentals, unfavorable outlook (confidence in alternative investments is high)

The confidence score reflects how confident you are in your decision (not in the stock itself).
Provide 3-5 bullish and bearish factors each.`,
    },
    {
      role: "user",
      content: `## Company: ${fullName} (${ticker})

## Full Analysis
${state.analysis || "No analysis available."}

## Raw Research Summary
Financial: ${state.financialData ? "Available" : "Missing"}
News: ${state.newsData ? "Available" : "Missing"}
Competitors: ${state.competitorData ? "Available" : "Missing"}
Industry: ${state.industryData ? "Available" : "Missing"}

Make your investment decision now.`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  let parsed: {
    decision: "INVEST" | "PASS" | "MONITOR";
    confidence: number;
    reasoning: string;
    bullishFactors: string[];
    bearishFactors: string[];
  };

  try {
    // Extract JSON from possible markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp confidence
    parsed.confidence = Math.max(0, Math.min(100, parsed.confidence));

    // Validate decision
    if (!["INVEST", "PASS", "MONITOR"].includes(parsed.decision)) {
      parsed.decision = "MONITOR";
    }
  } catch {
    parsed = {
      decision: "MONITOR",
      confidence: 50,
      reasoning:
        "Unable to parse the LLM decision output. The analysis is available for manual review.",
      bullishFactors: ["Analysis data available for review"],
      bearishFactors: ["Automated decision parsing failed"],
    };
  }

  return {
    decision: parsed.decision,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    bullishFactors: parsed.bullishFactors,
    bearishFactors: parsed.bearishFactors,
    currentStep: "makeDecision",
    completedSteps: ["makeDecision"],
  };
}
