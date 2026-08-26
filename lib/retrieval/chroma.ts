import { ChromaClient, type Collection } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

const COLLECTION_NAME = process.env.CHROMA_COLLECTION ?? "vaults";

declare global {
  var _chromaCollection: Promise<Collection> | undefined;
}

function buildClient(): ChromaClient {
  const url = new URL(process.env.CHROMA_URL ?? "http://localhost:8001");
  return new ChromaClient({
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    ssl: url.protocol === "https:",
  });
}

/** Same embedding function the ingestion pipeline used ("default" — Chroma's
 * built-in all-MiniLM-L6-v2 via ONNX) — queries must use the same one the
 * collection was created with, or similarity search is meaningless. */
export function getVaultsCollection(): Promise<Collection> {
  if (!global._chromaCollection) {
    global._chromaCollection = buildClient().getCollection({
      name: COLLECTION_NAME,
      embeddingFunction: new DefaultEmbeddingFunction(),
    });
  }
  return global._chromaCollection;
}
