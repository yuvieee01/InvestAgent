import { Annotation } from "@langchain/langgraph";

/**
 * The AgentState is the spine of the whole agent graph.
 * Every node reads from it and writes to it.
 *
 * Channel annotations define how state updates are merged.
 */
export const AgentStateAnnotation = Annotation.Root({
  // Input
  company: Annotation<string>(),

  // Resolved company info
  ticker: Annotation<string | undefined>(),
  sector: Annotation<string | undefined>(),
  fullName: Annotation<string | undefined>(),

  // Research node outputs
  financialData: Annotation<string | undefined>(),
  newsData: Annotation<string | undefined>(),
  competitorData: Annotation<string | undefined>(),
  industryData: Annotation<string | undefined>(),

  // Analysis node synthesizes all four above
  analysis: Annotation<string | undefined>(),

  // Final decision node output
  decision: Annotation<"INVEST" | "PASS" | "MONITOR" | undefined>(),
  confidence: Annotation<number | undefined>(),
  reasoning: Annotation<string | undefined>(),
  bullishFactors: Annotation<string[] | undefined>(),
  bearishFactors: Annotation<string[] | undefined>(),

  // UI tracking
  completedSteps: Annotation<string[]>({
    reducer: (current, update) => [...(current || []), ...update],
    default: () => [],
  }),
  currentStep: Annotation<string | undefined>(),

  // User-provided API keys (passed from frontend)
  userGoogleKey: Annotation<string | undefined>(),
  userTavilyKey: Annotation<string | undefined>(),
});

export type AgentState = typeof AgentStateAnnotation.State;
