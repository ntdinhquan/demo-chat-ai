import { ChromaClient, type Collection } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

let collection: Promise<Collection> | null = null;

/**
 * Lazy singleton for the "vaults" collection restored via docker-compose
 * (see CLAUDE.md) — LGBTQ+-friendliness evidence documents tagged with
 * venue_ids/hotel_ids that join back to the warehouse Postgres rows.
 * Queries are embedded here in Node with the same "default" MiniLM function
 * the backup was built with, rather than relying on server-side config.
 */
export function getVaultsCollection(): Promise<Collection> {
  if (!collection) {
    const client = new ChromaClient({ path: process.env.CHROMA_URL });
    collection = client.getOrCreateCollection({
      name: "vaults",
      embeddingFunction: new DefaultEmbeddingFunction(),
    });
  }
  return collection;
}
