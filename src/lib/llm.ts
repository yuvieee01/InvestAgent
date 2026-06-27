import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, AIMessageChunk } from "@langchain/core/messages";

// The ordered list of models to try.
// If one hits a rate limit or fails, the system immediately tries the next one.
const MODELS_CASCADE = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
];

/**
 * Creates an LLM wrapper that cascades through multiple models sequentially.
 * No backoff waiting; it just immediately switches to the next model.
 */
export function createLLM(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error(
      "No LLM API key found. Set GOOGLE_API_KEY in .env.local"
    );
  }

  // Pre-initialize all model instances
  const instances = MODELS_CASCADE.map(
    (modelName) =>
      new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: key,
        temperature: 0.3,
        maxOutputTokens: 8192,
      })
  );

  return {
    async invoke(
      messages: BaseMessage[] | { role: string; content: string }[]
    ): Promise<AIMessageChunk> {
      let lastError: Error | null = null;

      // Try each model in sequence
      for (let i = 0; i < instances.length; i++) {
        const llm = instances[i];
        const modelName = MODELS_CASCADE[i];

        try {
          return await llm.invoke(messages);
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          console.log(
            `[LLM] Model ${modelName} failed: ${lastError.message.substring(0, 150)}...`
          );

          if (i < instances.length - 1) {
            const nextModelName = MODELS_CASCADE[i + 1];
            console.log(`[LLM] Immediately switching to next model: ${nextModelName}`);
          }
        }
      }

      throw (
        lastError ||
        new Error(`[LLM] All ${instances.length} cascade models failed.`)
      );
    },
  };
}

/**
 * Default LLM instance using env keys
 */
export const defaultLLM = createLLM();
