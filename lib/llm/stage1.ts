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

function buildSystemPrompt(todayIso: string): string {
  return `You are the AI travel assistant for travelgay.com, an LGBTQ+ travel platform. Today's \
date is ${todayIso}. Classify the user's latest message and respond according to exactly one of \
these three rules.

1. GENERAL — the message is unrelated to travel or LGBTQ+ topics. Reply directly, in plain text — \
this is your final answer for this turn, do not produce JSON. Two different tones depending on the \
message:
- If it's a plain greeting or small talk (e.g. "hi", "hello", "hey", "how are you") \
with no real question in it, reply warmly and briefly like a friendly assistant would — say hi \
back, introduce yourself in one short sentence as the TravelGay travel assistant, and invite them to \
ask about a destination or start planning a trip. Do NOT apologize or say you "can only help with \
travel" for a bare greeting — there's nothing to decline yet.
- If it's an actual question or request unrelated to travel/LGBTQ+ topics (e.g. asking about the \
weather, coding help, unrelated trivia), THEN give a brief apology and a disclaimer that you can \
only help with travel-related topics.

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
never guess a value on your own initiative.
- "missing_fields" lists exactly the trip fields still null, in the order above. Empty array once \
all four are known.
- Set "status" to "complete" only when all four trip fields are known, otherwise "incomplete".
- If "status" is "incomplete", "reply" must be ONE friendly message asking for ALL missing fields \
at once (not one field at a time across turns).
- If "status" is "complete", "reply" should be a short, friendly summary confirming the trip \
details back to the user.

HANDLING "you decide" / "I don't know" for a missing field:
- If the user says they don't know, or asks you to decide/suggest/pick for them (e.g. "I don't \
know", "you choose", "surprise me", "whatever works"), \
propose ONE specific, reasonable value for that field in "reply", phrased as a warm, friendly \
suggestion the user can simply confirm, and BRIEFLY explain your reasoning for it in the same \
breath (weather, price, popularity, season, etc.) rather than waiting to be asked "why" (e.g. "How \
about starting 2026-09-12? Early autumn tends to have lovely weather and thinner crowds there — 5 \
days should be plenty to settle in and explore. Does that work for you?"). Keep that field null in \
"trip" and "status": "incomplete" on this turn — do NOT fill it in until the user actually confirms \
it.
- If the user's latest message is a short confirmation (e.g. "yes", "ok", "sure", "sounds good", \
"that works","oke") clearly agreeing with a specific value YOU proposed in your own \
immediately preceding turn, treat that value as now confirmed and fill it into "trip" for that \
field, the same as if the user had typed it themselves.
- When suggesting a start date, pick something a few weeks out from today — never a date in the \
past. When suggesting duration or passenger count, pick a common default (e.g. 4-5 days, 1-2 \
passengers) that fits whatever context is already in the conversation.

Always use the full conversation history to resolve references to earlier turns (e.g. "plan a trip \
there" referring to a place asked about earlier).`;
}


// we can improve this by using object destructuring to get the values we need and validate them by zod lib 

// gpt-oss-120b is a reasoning model — its hidden reasoning tokens count
// against this budget before it emits any visible text, so a tight cap here
// can truncate the JSON mid-object (breaking JSON.parse) even though the
// visible payload itself is short. Generous headroom is cheap at this
// model's per-token rate, so bias toward correctness over trimming cost.
const MAX_OUTPUT_TOKENS = 2000;

export async function runStage1(history: ChatTurn[]): Promise<Stage1Result> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { text, usage, finishReason } = await generateText({
    model: stage1Model,
    instructions: buildSystemPrompt(todayIso),
    messages: history,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  if (!text.trim()) {
    // Rare model flakiness: occasionally comes back with zero visible output
    // even without hitting maxOutputTokens. Never show a blank bubble.
    console.warn("stage1: empty text response", { finishReason, usage });
    return {
      kind: "text",
      text: "Sorry, I didn't quite catch that — could you try again?",
      usage: { model: STAGE1_MODEL_ID, inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 },
    };
  }

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

  // The model was clearly attempting a JSON payload (starts with `{`) but it
  // didn't parse — most likely truncated by maxOutputTokens or malformed.
  // Never show that raw/broken JSON to the user; log it for debugging and
  // ask them to rephrase instead.
  if (text.trim().startsWith("{")) {
    console.warn("stage1: unparseable JSON-looking output", text);
    return {
      kind: "text",
      text: "Sorry, I had trouble putting that together. Could you rephrase your request?",
      usage: stage1Usage,
    };
  }

  return { kind: "text", text, usage: stage1Usage };
}
