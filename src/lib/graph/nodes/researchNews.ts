import { AgentState } from "../state";
import { tavilySearch } from "../../tools/search";
import { createLLM } from "../../llm";

/**
 * researchNews node
 * Searches recent headlines, analyst ratings, and regulatory news.
 */
export async function researchNews(
  state: AgentState
): Promise<Partial<AgentState>> {
  const ticker = state.ticker || state.company;
  const fullName = state.fullName || state.company;

  const queries = [
    `${fullName} ${ticker} latest news analyst ratings 2024 2025`,
    `${fullName} regulatory news SEC filings product launches`,
  ];

  const searchResults: string[] = [];
  for (const query of queries) {
    const result = await tavilySearch(query, state.userTavilyKey);
    searchResults.push(result);
  }

  const combinedResults = searchResults.join("\n\n---\n\n");

  const llm = createLLM(state.userGoogleKey);
  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a financial news analyst. Summarize the following news and analyst activity into a clear briefing. Include:
- Recent major headlines and developments
- Analyst ratings and price targets (buy/sell/hold consensus)
- Any regulatory or legal developments
- Product launches or strategic moves
- Market sentiment

Be factual and concise (2-3 paragraphs).`,
    },
    {
      role: "user",
      content: `News and analyst data for ${fullName} (${ticker}):\n\n${combinedResults}`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    newsData: content,
    currentStep: "researchNews",
    completedSteps: ["researchNews"],
  };
}
