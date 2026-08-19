import { mockRetriever } from "./mock";
import type { Retriever } from "./types";

/** The active Retriever. Swap this line for a pgvector/Postgres
 * implementation later — nothing else in the codebase needs to change. */
export const retriever: Retriever = mockRetriever;

export type { PlaceRecord, Retriever, SearchHit } from "./types";
