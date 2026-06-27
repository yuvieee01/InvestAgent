import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { BaseMessage, AIMessageChunk } from "@langchain/core/messages";

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a Gemini LLM instance.
 */
function createGeminiLLM(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  if (!key) return null;

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: key,
    temperature: 0.3,
    maxOutputTokens: 8192,
  });
}

/**
 * Creates a Groq LLM instance (fallback).
 * Uses llama-3.3-70b-versatile — fast and capable.
 */
function createGroqLLM(apiKey?: string) {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) return null;

  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: key,
    temperature: 0.3,
    maxTokens: 8192,
  });
}

/**
 * Rate-limit-aware LLM wrapper with Groq fallback.
 *
 * Strategy:
 * 1. Try Gemini first
 * 2. On 429 rate limit → immediately switch to Groq (no waiting)
 * 3. If Groq also fails → retry Gemini once after a delay
 */
export function createLLM(apiKey?: string) {
  const gemini = createGeminiLLM(apiKey);
  const groq = createGroqLLM();

  if (!gemini && !groq) {
    throw new Error(
      "No LLM API key found. Set GOOGLE_API_KEY or GROQ_API_KEY in .env.local"
    );
  }

  return {
    async invoke(
      messages: BaseMessage[] | { role: string; content: string }[]
    ): Promise<AIMessageChunk> {
      // Try Gemini first
      if (gemini) {
        try {
          return await gemini.invoke(messages);
        } catch (error: unknown) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);

          if (
            errorMsg.includes("429") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("rate")
          ) {
            console.log(
              "[LLM] Gemini rate limited → switching to Groq fallback"
            );
            // Fall through to Groq below
          } else {
            // Non-rate-limit error — try Groq as general fallback
            console.log(
              `[LLM] Gemini error: ${errorMsg.slice(0, 100)} → trying Groq`
            );
          }
        }
      }

      // Groq fallback
      if (groq) {
        try {
          return await groq.invoke(messages);
        } catch (error: unknown) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.log(`[LLM] Groq also failed: ${errorMsg.slice(0, 100)}`);

          // If Groq also fails and we have Gemini, retry once after delay
          if (gemini) {
            console.log("[LLM] Retrying Gemini after 60s cooldown...");
            await sleep(60000);
            return await gemini.invoke(messages);
          }

          throw error;
        }
      }

      // If only Gemini (no Groq), retry with backoff
      if (gemini) {
        console.log("[LLM] No Groq fallback. Retrying Gemini after 60s...");
        await sleep(60000);
        return await gemini.invoke(messages);
      }

      throw new Error("No LLM available");
    },
  };
}

/**
 * Default LLM instance using env keys
 */
export const defaultLLM = createLLM();
