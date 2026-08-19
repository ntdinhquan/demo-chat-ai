import { createOpenAI } from "@ai-sdk/openai";

/**
 * Thin wrapper around the model-calling mechanism. Stage 1 (`stage1.ts`) and
 * Stage 2 (`stage2.ts`) only ever get a LanguageModel from here — never touch
 * a base URL or API key directly. That keeps the underlying gateway
 * swappable (Bedrock Mantle today, anything OpenAI-compatible later).
 */

const apiKey = process.env.OPENAI_API_KEY ?? process.env.AWS_BEARER_TOKEN_BEDROCK ?? "";

// gpt-oss models are served on this path.
const stage1Provider = createOpenAI({
  apiKey,
  baseURL: process.env.AWS_BEDROCK_OPENAI_URL,
});

// Grok/Gemma models are served on this separate Mantle path.
const stage2Provider = createOpenAI({
  apiKey,
  baseURL: process.env.AWS_BEDROCK_OPENAI_MANTLE_PATH_URL,
});

export const STAGE1_MODEL_ID = "openai.gpt-oss-120b";
export const STAGE2_MODEL_ID = "google.gemma-4-31b";

export const stage1Model = stage1Provider.chat(STAGE1_MODEL_ID);
export const stage2Model = stage2Provider.chat(STAGE2_MODEL_ID);
