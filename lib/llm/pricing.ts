// USD price per 1,000 tokens, keyed by model id. Converted from AWS Bedrock's
// published Standard-tier per-1M-token rates for US West (Oregon) — matches
// the us-west-2 region used in the Mantle gateway URLs (see providers.ts).
// Update these if the gateway ever moves region or tier (e.g. Priority/Flex).
const PRICING_PER_1K_TOKENS: Record<string, { in: number; out: number }> = {
  "openai.gpt-oss-120b": { in: 0.00015, out: 0.0006 }, // $0.15 / $0.60 per 1M tokens
  "google.gemma-4-31b": { in: 0.00014, out: 0.0004 }, // $0.14 / $0.40 per 1M tokens
};

const DEFAULT_PRICING = { in: 0.001, out: 0.002 };

export function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_PER_1K_TOKENS[modelId] ?? DEFAULT_PRICING;
  return (inputTokens / 1000) * pricing.in + (outputTokens / 1000) * pricing.out;
}
