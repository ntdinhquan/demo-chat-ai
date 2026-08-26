import type { PlaceRecord, Retriever, SearchHit } from "./types";
import { getVaultsCollection } from "./chroma";
import { getDatawarehousePool } from "./db";

type HotelExtra = {
  google_map?: {
    category?: string | null;
    description?: string | null;
    amenities?: string[];
    lgbtq_friendly?: boolean;
    highlights?: string[];
  };
};

type HotelSocials = {
  website?: string;
  booking?: string;
};

type HotelRow = {
  id: string;
  name: string;
  review_score: number | null;
  extra: HotelExtra | null;
  socials: HotelSocials | null;
  country_name: string | null;
  state_name: string | null;
};

class HotelsRetriever implements Retriever {
  async search(query: string, topN = 5): Promise<SearchHit[]> {
    const collection = await getVaultsCollection();

    // "google_map_overview" is the one identity document per hotel — the
    // "vaults" collection also holds individual guest reviews (source:
    // provider name), which aren't useful as search hits on their own.
    const result = await collection.query({
      queryTexts: [query],
      nResults: topN,
      where: { source: { $eq: "google_map_overview" } },
      include: ["metadatas", "distances"],
    });

    const metadatas = result.metadatas[0] ?? [];
    const distances = result.distances[0] ?? [];

    const hits: SearchHit[] = [];
    for (let i = 0; i < metadatas.length; i++) {
      const hotelId = (metadatas[i]?.hotel_ids as string[] | undefined)?.[0];
      const distance = distances[i];
      if (!hotelId || distance == null) continue;
      // l2 distance, lower = closer — invert to a (0, 1] score, higher = better.
      hits.push({ id: hotelId, score: 1 / (1 + distance) });
    }
    return hits;
  }

  async getDetails(ids: string[]): Promise<PlaceRecord[]> {
    if (ids.length === 0) return [];

    const pool = getDatawarehousePool();
    const { rows } = await pool.query<HotelRow>(
      `SELECT h.id, h.name, h.review_score, h.extra, h.socials,
              TRIM(c.name) AS country_name, s.name AS state_name
       FROM datawarehouse.hotels h
       LEFT JOIN datawarehouse.countries c ON c.id = h.country_id
       LEFT JOIN datawarehouse.states s ON s.id = h.state_id
       WHERE h.id = ANY($1::uuid[])`,
      [ids],
    );

    return rows.map((row) => {
      const googleMap = row.extra?.google_map;
      return {
        id: row.id,
        name: row.name,
        city: row.state_name ?? "",
        country: row.country_name ?? "",
        locationType: googleMap?.category?.toLowerCase() || "hotel",
        description: googleMap?.description ?? "",
        keywords: googleMap?.amenities ?? [],
        links: { website: row.socials?.website, booking: row.socials?.booking },
        // No photo data anywhere in the datawarehouse (DB or Chroma) yet —
        // PlaceThumbnails already skips places with an empty photos array.
        photos: [],
        rating: row.review_score ?? 0,
      };
    });
  }
}

export const hotelsRetriever: Retriever = new HotelsRetriever();
