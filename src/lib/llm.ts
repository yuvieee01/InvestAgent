import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage } from "@langchain/core/messages";
import { AIMessageChunk } from "@langchain/core/messages";

/**
 * Creates a Gemini 2.5 Flash LLM instance.
 * If a user-provided API key is passed, it uses that;
 * otherwise falls back to the env variable.
 */
export function createRawLLM(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please provide it in .env.local or pass your own key."
    );
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: key,
    temperature: 0.3,
    maxOutputTokens: 8192,
  });
}

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate-limit-aware LLM wrapper.
 * Retries on 429 errors with exponential backoff.
 * This handles the Gemini free-tier limit of 5 req/min.
 */
export function createLLM(apiKey?: string) {
  const rawLLM = createRawLLM(apiKey);

  return {
    async invoke(
      messages: BaseMessage[] | { role: string; content: string }[]
    ): Promise<AIMessageChunk> {
      const maxRetries = 4;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await rawLLM.invoke(messages);
          return result;
        } catch (error: unknown) {
          lastError = error as Error;
          const errorMsg =
            error instanceof Error ? error.message : String(error);

          // Check if it's a rate limit error (429)
          if (errorMsg.includes("429") || errorMsg.includes("quota")) {
            // Extract retry delay from error if available
            const retryMatch = errorMsg.match(/retry in (\d+)/i);
            const suggestedDelay = retryMatch
              ? parseInt(retryMatch[1], 10) * 1000
              : undefined;

            // Exponential backoff: 15s, 30s, 60s, 120s
            const baseDelay = suggestedDelay || 15000 * Math.pow(2, attempt);
            const jitter = Math.random() * 3000; // Add jitter to avoid thundering herd
            const delay = baseDelay + jitter;

            console.log(
              `[LLM] Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(delay / 1000)}s...`
            );
            await sleep(delay);
          } else {
            // Non-rate-limit error, throw immediately
            throw error;
          }
        }
      }

      throw lastError || new Error("LLM invocation failed after max retries");
    },
  };
}

/**
 * Default LLM instance using env key — used across graph nodes
 */
export const defaultLLM = createLLM();
