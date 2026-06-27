import { NextRequest } from "next/server";
import { investmentGraph } from "@/lib/graph/graph";

export const maxDuration = 120; // Allow up to 2 minutes for the full graph

/**
 * Streaming SSE endpoint that runs the investment research graph.
 * Pushes events as each node completes for real-time UI updates.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, userGoogleKey, userTavilyKey } = body;

    if (!company || typeof company !== "string") {
      return new Response(
        JSON.stringify({ error: "Company name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check search count from header (managed by frontend)
    const searchCount = parseInt(
      req.headers.get("x-search-count") || "0",
      10
    );
    const freeLimit = parseInt(
      process.env.FREE_SEARCH_LIMIT || "3",
      10
    );

    // After free limit, require user keys
    if (searchCount >= freeLimit) {
      if (!userGoogleKey || !userTavilyKey) {
        return new Response(
          JSON.stringify({
            error: "API_KEYS_REQUIRED",
            message:
              "Free searches exhausted. Please provide your own API keys.",
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Send initial event
          sendEvent("start", {
            company,
            message: `Starting research on ${company}...`,
          });

          // Stream the graph execution
          const streamEvents = investmentGraph.streamEvents(
            {
              company,
              userGoogleKey:
                searchCount < freeLimit ? undefined : userGoogleKey,
              userTavilyKey:
                searchCount < freeLimit ? undefined : userTavilyKey,
            },
            { version: "v2" }
          );

          const completedNodes = new Set<string>();

          for await (const event of streamEvents) {
            // Listen for node completion events
            if (
              event.event === "on_chain_end" &&
              event.name &&
              event.name !== "LangGraph" &&
              !completedNodes.has(event.name)
            ) {
              completedNodes.add(event.name);

              const nodeOutput = event.data?.output;

              // Map node names to user-friendly labels
              const nodeLabels: Record<string, string> = {
                resolveCompany: "🔍 Resolving company...",
                researchFinancials: "📊 Researching financials...",
                researchNews: "📰 Fetching news...",
                researchCompetitors: "🏁 Analyzing competitors...",
                researchIndustry: "🌍 Researching industry trends...",
                analyzeAll: "🧠 Synthesizing analysis...",
                makeDecision: "⚖️ Making investment decision...",
              };

              const label = nodeLabels[event.name] || event.name;

              sendEvent("node_complete", {
                node: event.name,
                label,
                data: nodeOutput || {},
              });

              // If this is the final node, send the complete result
              if (event.name === "makeDecision" && nodeOutput) {
                sendEvent("result", {
                  company,
                  ticker: nodeOutput.ticker,
                  fullName: nodeOutput.fullName,
                  sector: nodeOutput.sector,
                  decision: nodeOutput.decision,
                  confidence: nodeOutput.confidence,
                  reasoning: nodeOutput.reasoning,
                  bullishFactors: nodeOutput.bullishFactors,
                  bearishFactors: nodeOutput.bearishFactors,
                  analysis: nodeOutput.analysis,
                });
              }
            }
          }

          // Get final state after graph completion
          // Send done event
          sendEvent("done", { message: "Research complete" });
        } catch (error) {
          console.error("Graph execution error:", error);
          sendEvent("error", {
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
