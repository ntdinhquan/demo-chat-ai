const JSON_FENCE_RE = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;

/**
 * Parses a model's JSON reply, tolerating markdown code fences around it —
 * some models wrap JSON in ```json ... ``` even when asked not to.
 * Returns null if the text isn't parseable JSON either way.
 */
export function parseJsonResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = JSON_FENCE_RE.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
