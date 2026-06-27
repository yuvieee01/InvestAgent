import { AgentState } from "../state";
import { createLLM } from "../../llm";

/**
 * analyzeAll node
 * Takes all four research outputs and produces a structured investment thesis.
 * This is where Gemini's large context window pays off.
 */
export async function analyzeAll(
  state: AgentState
): Promise<Partial<AgentState>> {
  const llm = createLLM(state.userGoogleKey);

  const fullName = state.fullName || state.company;
  const ticker = state.ticker || state.company;
  const sector = state.sector || "Unknown";

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a senior investment analyst at a top-tier investment bank. You have been given comprehensive research on a company from four different research streams: financials, news, competitive landscape, and industry trends.

Your job is to synthesize all of this into a coherent investment thesis. Write a thorough analysis (3-5 paragraphs) that:

1. Summarizes the company's financial health and trajectory
2. Evaluates recent news and sentiment impact
3. Assesses competitive positioning and moat durability
4. Contextualizes within industry/macro trends
5. Identifies the key risk/reward dynamics

Be analytical, specific, and balanced. Reference specific data points from the research.`,
    },
    {
      role: "user",
      content: `## Company: ${fullName} (${ticker}) — ${sector}

## Financial Research
${state.financialData || "No financial data available."}

## News & Analyst Research
${state.newsData || "No news data available."}

## Competitive Research
${state.competitorData || "No competitor data available."}

## Industry Research
${state.industryData || "No industry data available."}

Please provide your synthesized investment analysis.`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    analysis: content,
    currentStep: "analyzeAll",
    completedSteps: ["analyzeAll"],
  };
}
