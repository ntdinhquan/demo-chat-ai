import { warehouseRetriever } from "./warehouse";
import type { Retriever } from "./types";

/** The active Retriever. See lib/retrieval/mock.ts for the fictional
 * dataset this replaced — nothing else in the codebase needs to change
 * if this line is swapped again later. */
export const retriever: Retriever = warehouseRetriever;

export type { PlaceRecord, Retriever, SearchHit } from "./types";
