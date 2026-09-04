#!/usr/bin/env node
// Try a semantic search against the restored Chroma "vaults" collection directly,
// bypassing the app — useful for poking at what the vault actually returns for a
// given query (see docs/chroma-vs-postgres-search.md for why this isn't used as
// the app's primary search anymore).
//
// Usage:
//   node scripts/chroma-search.mjs "gay-friendly bar in Barcelona" [nResults]

import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

const query = process.argv[2];
const nResults = Number(process.argv[3]) || 15;

if (!query) {
  console.error('Usage: node scripts/chroma-search.mjs "<query text>" [nResults]');
  process.exit(1);
}

function toIdArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

const client = new ChromaClient({ path: process.env.CHROMA_URL || "http://localhost:8000" });
const collection = await client.getOrCreateCollection({
  name: "vaults",
  embeddingFunction: new DefaultEmbeddingFunction(),
});

const result = await collection.query({
  queryTexts: [query],
  nResults,
  include: ["metadatas", "distances", "documents"],
});

const rows = result.rows()[0] ?? [];
console.log(`\nQuery: "${query}"  (top ${nResults} raw hits)\n`);

const entityIds = new Set();
for (const row of rows) {
  const meta = row.metadata ?? {};
  const ids = [...toIdArray(meta.venue_ids), ...toIdArray(meta.hotel_ids)];
  ids.forEach((id) => entityIds.add(id));

  const snippet = (row.document ?? "").replace(/\s+/g, " ").slice(0, 100);
  console.log(
    `distance=${row.distance?.toFixed(4)}  entity=${ids[0] ?? "(none)"}  ` +
      `lgbt_mention=${meta.lgbt_mention ?? "-"}  lgbt_kind=${meta.lgbt_kind ?? "-"}  source=${meta.source ?? "-"}`,
  );
  console.log(`  "${snippet}${snippet.length === 100 ? "…" : ""}"`);
}

console.log(`\n${rows.length} raw hits -> ${entityIds.size} distinct entity id(s):`);
console.log([...entityIds]);
