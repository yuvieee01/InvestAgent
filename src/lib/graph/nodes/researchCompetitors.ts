import { AgentState } from "../state";
import { tavilySearch } from "../../tools/search";
import { createLLM } from "../../llm";

/**
 * researchCompetitors node
 * Looks at market share, competitive moat, and industry dynamics.
 */
export async function researchCompetitors(
  state: AgentState
): Promise<Partial<AgentState>> {
  const ticker = state.ticker || state.company;
  const fullName = state.fullName || state.company;
  const sector = state.sector || "technology";

  const queries = [
    `${fullName} competitors market share ${sector} industry 2024 2025`,
    `${fullName} competitive advantage moat vs competitors`,
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
      content: `You are a competitive intelligence analyst. Summarize the competitive landscape. Include:
- Key competitors and their relative market positions
- Market share estimates (if available)
- Competitive moat and differentiators
- Threats from competitors or new entrants
- Strategic positioning strengths and vulnerabilities

Be specific and concise (2-3 paragraphs).`,
    },
    {
      role: "user",
      content: `Competitive data for ${fullName} (${ticker}) in ${sector}:\n\n${combinedResults}`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    competitorData: content,
    currentStep: "researchCompetitors",
    completedSteps: ["researchCompetitors"],
  };
}
