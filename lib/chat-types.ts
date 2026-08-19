import type { UIMessage } from "ai";
import type { LocationQueryJson, PlanningCompleteJson, TripFieldName } from "./llm/stage1";
import type { PlaceRecord } from "./retrieval";

export type DebugData = {
  stage1Json: LocationQueryJson | PlanningCompleteJson;
  retrieved: PlaceRecord[];
};

export type SuggestionsData = {
  missingFields: TripFieldName[];
};

export type ChatUIMessage = UIMessage<unknown, { debug: DebugData; suggestions: SuggestionsData }>;
