import { TavilySearch } from "@langchain/tavily";

/**
 * Creates a Tavily search tool instance.
 * Uses user-provided key if available, otherwise env key.
 */
export function createSearchTool(apiKey?: string) {
  const key = apiKey || process.env.TAVILY_API_KEY;

  if (!key) {
    throw new Error(
      "TAVILY_API_KEY is not set. Please provide it in .env.local or pass your own key."
    );
  }

  return new TavilySearch({
    maxResults: 5,
    tavilyApiKey: key,
  });
}

/**
 * Performs a Tavily search with the given query.
 * Returns the search results as a string.
 */
export async function tavilySearch(
  query: string,
  apiKey?: string
): Promise<string> {
  const tool = createSearchTool(apiKey);
  const results = await tool.invoke({ query });

  // Results come back as a string from the tool
  if (typeof results === "string") {
    return results;
  }

  return JSON.stringify(results);
}
