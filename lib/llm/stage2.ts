import { streamText } from "ai";
import type { ChatTurn } from "@/lib/conversation";
import type { PlaceRecord } from "@/lib/retrieval";
import type { LocationQueryJson, PlanningCompleteJson } from "./stage1";
import { stage2Model } from "./providers";

const SYSTEM_PROMPT = `You are the AI travel assistant for travelgay.com, an LGBTQ+ travel platform. \
An internal routing step has already classified the user's request and retrieved candidate places \
from our database. Compose a warm, specific, natural-language reply for the chat UI.

Reference the retrieved places by name where relevant, and mention their website/booking links so \
the traveler can follow up. If a retrieved photo URL is available you may mention that a photo is \
available, but do not invent details (ratings, addresses, amenities) beyond what's given to you. If \
no places were retrieved for the request, say so honestly and offer general LGBTQ+ travel advice \
instead of inventing options.`;

export function runStage2(params: {
  history: ChatTurn[];
  stage1Json: LocationQueryJson | PlanningCompleteJson;
  retrieved: PlaceRecord[];
}) {
  const { history, stage1Json, retrieved } = params;

  const context = `ROUTING RESULT FROM STAGE 1:\n${JSON.stringify(stage1Json, null, 2)}\n\n` +
    `RETRIEVED PLACES:\n${JSON.stringify(retrieved, null, 2)}`;

  return streamText({
    model: stage2Model,
    instructions: `${SYSTEM_PROMPT}\n\n${context}`,
    messages: history,
  });
}
