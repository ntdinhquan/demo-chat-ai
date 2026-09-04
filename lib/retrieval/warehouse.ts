import { getVaultsCollection } from "./chroma";
import { getWarehousePool } from "./db";
import type { PlaceRecord, Retriever, SearchHit } from "./types";

function toIdArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
}

/** extra/socials are loosely-shaped json that differs between venues and hotels — read the first path that has a value. */
function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

type WarehouseRow = {
  id: string;
  name: string;
  location_type: string;
  review_score: number;
  extra: Record<string, unknown> | null;
  socials: Record<string, unknown> | null;
  country_name: string;
  state_name: string;
};

async function fetchAllEntities(): Promise<WarehouseRow[]> {
  const pool = getWarehousePool();
  const { rows } = await pool.query<{
    id: string;
    name: string;
    review_score: number;
    extra: Record<string, unknown> | null;
    socials: Record<string, unknown> | null;
    location_type: string;
    country_name: string | null;
    state_name: string | null;
  }>(
    `select v.id, v.name, v.review_score, v.extra, v.socials, v.type as location_type,
            trim(both from c.name) as country_name, trim(both from s.name) as state_name
     from datawarehouse.venues v
     left join datawarehouse.countries c on c.id = v.country_id
     left join datawarehouse.states s on s.id = v.state_id
     union all
     select h.id, h.name, h.review_score, h.extra, h.socials, 'Hotel' as location_type,
            trim(both from c.name) as country_name, trim(both from s.name) as state_name
     from datawarehouse.hotels h
     left join datawarehouse.countries c on c.id = h.country_id
     left join datawarehouse.states s on s.id = h.state_id`,
  );
  return rows.map((row) => ({ ...row, country_name: row.country_name ?? "", state_name: row.state_name ?? "" }));
}

/**
 * Vector search over the Chroma vault (LGBTQ+-friendliness evidence docs) doesn't reliably
 * encode geography: a handful of heavily-reviewed entities dominate any query containing
 * generic words ("bar", "gay-friendly", "nightlife") regardless of city, even across hundreds
 * of nearest neighbors. So — mirroring mock.ts's field-weighted scoreOf() — Postgres is the
 * primary search here: score every real venue/hotel against the query's tokens/substrings,
 * requiring an actual city/country match before trusting any result. The vault is only used
 * afterward, as a secondary boost for entities it has LGBTQ+-related evidence for.
 */
function scoreOf(row: WarehouseRow, queryLower: string, tokens: string[]): number {
  let score = 0;
  if (row.state_name && queryLower.includes(row.state_name.toLowerCase())) score += 8;
  if (row.country_name && queryLower.includes(row.country_name.toLowerCase())) score += 5;

  const locationType = row.location_type.toLowerCase();
  const name = row.name.toLowerCase();
  for (const token of tokens) {
    if (locationType === token) score += 3;
    if (token.length >= 4 && name.includes(token)) score += 2;
  }
  return score;
}

async function entitiesWithLgbtEvidence(): Promise<Set<string>> {
  const collection = await getVaultsCollection();
  const result = await collection.get({ where: { lgbt_mention: true }, include: ["metadatas"], limit: 4000 });
  const ids = new Set<string>();
  for (const row of result.rows()) {
    const metadata = row.metadata ?? {};
    for (const id of [...toIdArray(metadata.venue_ids), ...toIdArray(metadata.hotel_ids)]) ids.add(id);
  }
  return ids;
}

function toPlaceRecord(row: WarehouseRow): PlaceRecord {
  const extra = row.extra ?? {};
  const googleMap = (extra.google_map as Record<string, unknown> | undefined) ?? {};
  const socials = row.socials ?? {};

  return {
    id: row.id,
    name: row.name,
    city: row.state_name,
    country: row.country_name,
    locationType: row.location_type,
    description: firstString(extra.description, googleMap.description) ?? "",
    keywords: [row.location_type],
    links: {
      website: firstString(socials.google_map as string | undefined, googleMap.nearby_link as string | undefined),
    },
    photos: [],
    rating: row.review_score,
  };
}

class WarehouseRetriever implements Retriever {
  async search(query: string, topN = 5): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const tokens = trimmed
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
    const queryLower = trimmed.toLowerCase();

    const [entities, lgbtEvidenceIds] = await Promise.all([fetchAllEntities(), entitiesWithLgbtEvidence()]);

    const hasGeoMatch = entities.some(
      (row) =>
        (row.state_name && queryLower.includes(row.state_name.toLowerCase())) ||
        (row.country_name && queryLower.includes(row.country_name.toLowerCase())),
    );
    if (!hasGeoMatch) return [];

    const scored = entities
      .map((row) => {
        let score = scoreOf(row, queryLower, tokens);
        // Hotels already carry an explicit friendliness flag; the vault's per-review
        // lgbt_mention signal is the closest equivalent available for venues.
        const explicitlyFriendly = (row.extra?.google_map as Record<string, unknown> | undefined)?.lgbtq_friendly;
        if (explicitlyFriendly === true) score += 1;
        if (lgbtEvidenceIds.has(row.id)) score += 1;
        return { id: row.id, score };
      })
      .filter((hit) => hit.score > 0);
    if (scored.length === 0) return [];

    const maxScore = Math.max(...scored.map((hit) => hit.score));
    return scored
      .filter((hit) => hit.score >= maxScore * 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  async getDetails(ids: string[]): Promise<PlaceRecord[]> {
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    const entities = await fetchAllEntities();
    const byId = new Map(entities.filter((row) => idSet.has(row.id)).map((row) => [row.id, row]));
    return ids.map((id) => byId.get(id)).filter((row): row is WarehouseRow => row !== undefined).map(toPlaceRecord);
  }
}

export const warehouseRetriever: Retriever = new WarehouseRetriever();
