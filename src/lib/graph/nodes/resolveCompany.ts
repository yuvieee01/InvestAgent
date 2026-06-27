import { AgentState } from "../state";
import { createLLM } from "../../llm";

/**
 * resolveCompany node
 * Takes a company name (e.g., "Apple") and resolves it to:
 * - ticker symbol (e.g., "AAPL")
 * - full legal name (e.g., "Apple Inc.")
 * - sector (e.g., "Technology")
 */
export async function resolveCompany(
  state: AgentState
): Promise<Partial<AgentState>> {
  const llm = createLLM(state.userGoogleKey);

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a financial data assistant. Given a company name, resolve it to its stock ticker symbol, full legal name, and business sector.
      
Respond ONLY in this exact JSON format with no other text:
{
  "ticker": "AAPL",
  "fullName": "Apple Inc.",
  "sector": "Technology"
}`,
    },
    {
      role: "user",
      content: `Resolve this company: "${state.company}"`,
    },
  ]);

  let parsed: { ticker: string; fullName: string; sector: string };

  try {
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Extract JSON from possible markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback if parsing fails
    parsed = {
      ticker: state.company.toUpperCase().slice(0, 4),
      fullName: state.company,
      sector: "Unknown",
    };
  }

  return {
    ticker: parsed.ticker,
    fullName: parsed.fullName,
    sector: parsed.sector,
    currentStep: "resolveCompany",
    completedSteps: ["resolveCompany"],
  };
}
