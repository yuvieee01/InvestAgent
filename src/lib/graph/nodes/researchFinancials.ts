import { AgentState } from "../state";
import { tavilySearch } from "../../tools/search";
import { createLLM } from "../../llm";

/**
 * researchFinancials node
 * Searches for financial data about the company and summarizes it.
 * Queries: revenue growth, earnings, P/E ratio, debt, free cash flow.
 */
export async function researchFinancials(
  state: AgentState
): Promise<Partial<AgentState>> {
  const ticker = state.ticker || state.company;
  const fullName = state.fullName || state.company;

  // Perform multiple targeted financial searches
  const queries = [
    `${ticker} revenue growth 2024 2025 earnings financial results`,
    `${fullName} P/E ratio debt free cash flow balance sheet`,
  ];

  const searchResults: string[] = [];
  for (const query of queries) {
    const result = await tavilySearch(query, state.userTavilyKey);
    searchResults.push(result);
  }

  const combinedResults = searchResults.join("\n\n---\n\n");

  // Use LLM to synthesize financial data
  const llm = createLLM(state.userGoogleKey);
  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a financial analyst. Summarize the following search results into a structured financial analysis. Include:
- Revenue trends and growth rate
- Earnings per share (EPS) and growth
- P/E ratio and valuation metrics
- Debt levels and debt-to-equity ratio
- Free cash flow
- Key financial strengths and weaknesses

Be specific with numbers when available. Keep the summary concise but comprehensive (2-3 paragraphs).`,
    },
    {
      role: "user",
      content: `Financial data for ${fullName} (${ticker}):\n\n${combinedResults}`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    financialData: content,
    currentStep: "researchFinancials",
    completedSteps: ["researchFinancials"],
  };
}
