import { StateGraph } from "@langchain/langgraph";
import { AgentStateAnnotation } from "./state";
import { resolveCompany } from "./nodes/resolveCompany";
import { researchFinancials } from "./nodes/researchFinancials";
import { researchNews } from "./nodes/researchNews";
import { researchCompetitors } from "./nodes/researchCompetitors";
import { researchIndustry } from "./nodes/researchIndustry";
import { analyzeAll } from "./nodes/analyzeAll";
import { makeDecision } from "./nodes/makeDecision";

/**
 * Assembles the LangGraph agent graph:
 *
 * resolveCompany → [researchFinancials, researchNews,
 *                   researchCompetitors, researchIndustry] (parallel)
 *                → analyzeAll → makeDecision
 */
function buildGraph() {
  const graph = new StateGraph(AgentStateAnnotation)
    // Add all nodes
    .addNode("resolveCompany", resolveCompany)
    .addNode("researchFinancials", researchFinancials)
    .addNode("researchNews", researchNews)
    .addNode("researchCompetitors", researchCompetitors)
    .addNode("researchIndustry", researchIndustry)
    .addNode("analyzeAll", analyzeAll)
    .addNode("makeDecision", makeDecision)

    // Entry point
    .addEdge("__start__", "resolveCompany")

    // After resolving company, fan out to 4 parallel research nodes
    .addEdge("resolveCompany", "researchFinancials")
    .addEdge("resolveCompany", "researchNews")
    .addEdge("resolveCompany", "researchCompetitors")
    .addEdge("resolveCompany", "researchIndustry")

    // All 4 research nodes converge into analyzeAll
    .addEdge("researchFinancials", "analyzeAll")
    .addEdge("researchNews", "analyzeAll")
    .addEdge("researchCompetitors", "analyzeAll")
    .addEdge("researchIndustry", "analyzeAll")

    // Analysis feeds into final decision
    .addEdge("analyzeAll", "makeDecision")

    // End
    .addEdge("makeDecision", "__end__");

  return graph.compile();
}

export const investmentGraph = buildGraph();
