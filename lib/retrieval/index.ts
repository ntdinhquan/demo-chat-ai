import { hotelsRetriever } from "./hotels";
import type { Retriever } from "./types";

/** The active Retriever — backed by the real ChromaDB "vaults" collection
 * (semantic search) + the datawarehouse Postgres `hotels` table (structured
 * details). `mock.ts` is kept around for reference/local dev without those
 * services running, but isn't wired in anymore. */
export const retriever: Retriever = hotelsRetriever;

export type { PlaceRecord, Retriever, SearchHit } from "./types";
