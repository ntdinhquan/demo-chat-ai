#!/usr/bin/env node
// Dump the entire "vaults" collection to a CSV file for manual browsing (Excel/VSCode).
// Contains raw scraped reviewer names/content — gitignored, local-viewing only.
//
// Usage: node scripts/chroma-dump.mjs [output-path]

import { writeFileSync } from "node:fs";
import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

const outPath = process.argv[2] || "chroma-export.csv";

function toIdArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const client = new ChromaClient({ path: process.env.CHROMA_URL || "http://localhost:8000" });
const collection = await client.getOrCreateCollection({
  name: "vaults",
  embeddingFunction: new DefaultEmbeddingFunction(),
});

const total = await collection.count();
console.log(`Collection has ${total} records — fetching in batches of 500...`);

const columns = ["id", "entity_id", "type", "source", "lgbt_mention", "lgbt_kind", "is_poc", "title", "document"];
const lines = [columns.join(",")];

const batchSize = 500;
for (let offset = 0; offset < total; offset += batchSize) {
  const result = await collection.get({ limit: batchSize, offset, include: ["metadatas", "documents"] });
  for (const row of result.rows()) {
    const meta = row.metadata ?? {};
    const entityId = [...toIdArray(meta.venue_ids), ...toIdArray(meta.hotel_ids)][0] ?? "";
    lines.push(
      [
        row.id,
        entityId,
        meta.type,
        meta.source,
        meta.lgbt_mention,
        meta.lgbt_kind,
        meta.is_poc,
        meta.title,
        row.document,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  console.log(`  ${Math.min(offset + batchSize, total)}/${total}`);
}

writeFileSync(outPath, lines.join("\n"), "utf-8");
console.log(`\nWrote ${lines.length - 1} rows to ${outPath}`);
