export type PlaceRecord = {
  id: string;
  name: string;
  city: string;
  country: string;
  locationType: string;
  description: string;
  keywords: string[];
  links: { website?: string; booking?: string };
  photos: string[];
  rating: number;
};

export type SearchHit = { id: string; score: number };

/**
 * Swap-in point for a real vector DB (pgvector/Postgres) later — Stage 2
 * only ever depends on this interface, never on mock vs. real details.
 */
export interface Retriever {
  search(query: string, topN?: number): Promise<SearchHit[]>;
  getDetails(ids: string[]): Promise<PlaceRecord[]>;
}
