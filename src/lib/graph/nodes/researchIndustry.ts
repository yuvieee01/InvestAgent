import { AgentState } from "../state";
import { tavilySearch } from "../../tools/search";
import { createLLM } from "../../llm";

/**
 * researchIndustry node
 * Macro trends for the sector — growth rate, headwinds, tailwinds.
 */
export async function researchIndustry(
  state: AgentState
): Promise<Partial<AgentState>> {
  const fullName = state.fullName || state.company;
  const sector = state.sector || "technology";

  const queries = [
    `${sector} industry outlook 2024 2025 growth rate trends`,
    `${sector} sector headwinds tailwinds macro trends regulation`,
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
      content: `You are a macro industry analyst. Summarize the industry trends and outlook. Include:
- Industry growth rate and market size projections
- Key tailwinds (positive macro factors)
- Key headwinds (challenges, regulation, disruption)
- Technological or structural shifts affecting the sector
- How these macro trends impact companies in this space

Be concise and forward-looking (2-3 paragraphs).`,
    },
    {
      role: "user",
      content: `Industry data for the ${sector} sector (relevant to ${fullName}):\n\n${combinedResults}`,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    industryData: content,
    currentStep: "researchIndustry",
    completedSteps: ["researchIndustry"],
  };
}
