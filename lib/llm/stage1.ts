import { generateText } from "ai";
import type { ChatTurn } from "@/lib/conversation";
import { parseJsonResponse } from "./parseJson";
import { STAGE1_MODEL_ID, stage1Model } from "./providers";

export type UsageInfo = { model: string; inputTokens: number; outputTokens: number };

export type LocationQueryJson = {
  intent: "location";
  query: {
    location_type: string;
    place_name: string | null;
    city: string | null;
    country: string | null;
    keywords: string[];
  };
  raw_question: string;
};

export type TripFieldName = "destination" | "start_date" | "duration_days" | "passengers";

export type PlanningCompleteJson = {
  intent: "planning";
  status: "complete";
  trip: {
    destination: string;
    start_date: string;
    duration_days: number;
    passengers: number;
  };
  reply: string;
  raw_question: string;
};

export type PlanningIncompleteJson = {
  intent: "planning";
  status: "incomplete";
  trip: {
    destination: string | null;
    start_date: string | null;
    duration_days: number | null;
    passengers: number | null;
  };
  missing_fields: TripFieldName[];
  reply: string;
  raw_question: string;
};

export type Stage1Result = { usage: UsageInfo } & (
  | { kind: "text"; text: string }
  | { kind: "location"; json: LocationQueryJson }
  | { kind: "planning"; json: PlanningCompleteJson }
  | { kind: "planning-incomplete"; json: PlanningIncompleteJson }
);

const SYSTEM_PROMPT = `You are the AI travel assistant for travelgay.com, an LGBTQ+ travel platform. \
Classify the user's latest message and respond according to exactly one of these three rules.

1. GENERAL — the question is unrelated to travel or LGBTQ+ topics. Reply directly, in plain text, \
with a brief apology and a disclaimer that you can only help with travel-related topics. This is \
your final answer for this turn — do not produce JSON.

2. LOCATION — the question is about a specific place, venue, hotel, bar, restaurant, or event \
related to LGBTQ+ travel. Do NOT answer directly. Instead, respond ONLY with JSON, no text outside \
it, in exactly this shape:
{
  "intent": "location",
  "query": {
    "location_type": "hotel | bar | restaurant | event | venue | city | region | country",
    "place_name": "string or null",
    "city": "string or null",
    "country": "string or null",
    "keywords": ["gay-friendly", "nightlife", "romantic dinner", "..."]
  },
  "raw_question": "the user's original message, verbatim"
}

3. PLANNING — the user wants a trip or itinerary planned. Using the FULL conversation history, \
collect: destination, start date, duration in days, and number of people (passengers). Respond \
ONLY with JSON, no text outside it, in exactly this shape:
{
  "intent": "planning",
  "status": "incomplete | complete",
  "trip": {
    "destination": "string or null",
    "start_date": "YYYY-MM-DD or null",
    "duration_days": "number or null",
    "passengers": "number or null"
  },
  "missing_fields": ["destination", "start_date", "duration_days", "passengers"],
  "reply": "a short, friendly message for the chat UI",
  "raw_question": "the user's original message, verbatim"
}
- Use null for any trip field you don't know yet (they may be filled in across earlier turns) — \
never guess a value.
- "missing_fields" lists exactly the trip fields still null, in the order above. Empty array once \
all four are known.
- Set "status" to "complete" only when all four trip fields are known, otherwise "incomplete".
- If "status" is "incomplete", "reply" must be ONE friendly message asking for ALL missing fields \
at once (not one field at a time across turns).
- If "status" is "complete", "reply" should be a short, friendly summary confirming the trip \
details back to the user.

Always use the full conversation history to resolve references to earlier turns (e.g. "plan a trip \
there" referring to a place asked about earlier).`;

// Router/collector output is always short (a JSON payload or one clarifying
// question) — this caps runaway generations without risking real truncation.
const MAX_OUTPUT_TOKENS = 400;

export async function runStage1(history: ChatTurn[]): Promise<Stage1Result> {
  const { text, usage } = await generateText({
    model: stage1Model,
    instructions: SYSTEM_PROMPT,
    messages: history,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  const stage1Usage: UsageInfo = {
    model: STAGE1_MODEL_ID,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };

  const parsed = parseJsonResponse(text);

  if (parsed?.intent === "location") {
    return { kind: "location", json: parsed as unknown as LocationQueryJson, usage: stage1Usage };
  }

  if (parsed?.intent === "planning" && parsed.status === "complete") {
    return { kind: "planning", json: parsed as unknown as PlanningCompleteJson, usage: stage1Usage };
  }

  if (parsed?.intent === "planning" && parsed.status === "incomplete") {
    return {
      kind: "planning-incomplete",
      json: parsed as unknown as PlanningIncompleteJson,
      usage: stage1Usage,
    };
  }

  return { kind: "text", text, usage: stage1Usage };
}
