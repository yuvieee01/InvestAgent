import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Creates a Gemini 2.5 Flash LLM instance.
 * If a user-provided API key is passed, it uses that;
 * otherwise falls back to the env variable.
 */
export function createLLM(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please provide it in .env.local or pass your own key."
    );
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-preview-05-20",
    apiKey: key,
    temperature: 0.3,
    maxOutputTokens: 8192,
  });
}

/**
 * Default LLM instance using env key — used across graph nodes
 */
export const defaultLLM = createLLM();
