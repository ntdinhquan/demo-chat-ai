import type { PlaceRecord, Retriever, SearchHit } from "./types";

/**
 * Hardcoded LGBTQ+-friendly places, standing in for a real vector DB +
 * Postgres. All names/links below are fictional demo data, not real
 * businesses. Spans the six cities used for continuity with the eval
 * project's test data: Bangkok, Berlin, Amsterdam, Provincetown, Cape Town,
 * Buenos Aires.
 */
const PLACES: PlaceRecord[] = [
  {
    id: "bkk-hotel-1",
    name: "Rainbow Silk Boutique Hotel",
    city: "Bangkok",
    country: "Thailand",
    locationType: "hotel",
    description:
      "A gay-friendly boutique hotel in Silom, walking distance from Bangkok's main LGBTQ+ nightlife strip. Rooftop pool, inclusive staff training.",
    keywords: ["gay-friendly", "boutique", "silom", "rooftop pool"],
    links: { website: "https://example.com/rainbow-silk-hotel", booking: "https://example.com/book/rainbow-silk-hotel" },
    photos: ["https://picsum.photos/seed/bkk-hotel-1/640/400"],
    rating: 4.6,
  },
  {
    id: "bkk-bar-1",
    name: "Sapphire Rooftop Bar",
    city: "Bangkok",
    country: "Thailand",
    locationType: "bar",
    description:
      "Open-air rooftop bar popular with the gay expat and local scene, known for sunset drag shows on weekends.",
    keywords: ["nightlife", "rooftop", "drag show", "gay bar"],
    links: { website: "https://example.com/sapphire-rooftop" },
    photos: ["https://picsum.photos/seed/bkk-bar-1/640/400"],
    rating: 4.4,
  },
  {
    id: "ber-bar-1",
    name: "Prism Nightclub",
    city: "Berlin",
    country: "Germany",
    locationType: "bar",
    description:
      "Long-running queer techno club in Kreuzberg with a famously inclusive door policy and legendary late-night crowd.",
    keywords: ["nightlife", "techno", "queer club", "kreuzberg"],
    links: { website: "https://example.com/prism-nightclub" },
    photos: ["https://picsum.photos/seed/ber-bar-1/640/400"],
    rating: 4.7,
  },
  {
    id: "ber-hotel-1",
    name: "Kreuzberg Pride Hotel",
    city: "Berlin",
    country: "Germany",
    locationType: "hotel",
    description:
      "Mid-range hotel in the heart of Berlin's gay district, a few minutes' walk from the city's best queer bars and cafes.",
    keywords: ["gay-friendly", "kreuzberg", "central", "mid-range"],
    links: { website: "https://example.com/kreuzberg-pride-hotel", booking: "https://example.com/book/kreuzberg-pride-hotel" },
    photos: ["https://picsum.photos/seed/ber-hotel-1/640/400"],
    rating: 4.3,
  },
  {
    id: "ams-hotel-1",
    name: "Canal House Rainbow Suites",
    city: "Amsterdam",
    country: "Netherlands",
    locationType: "hotel",
    description:
      "Boutique suites in a converted 17th-century canal house, a short stroll from Amsterdam's Reguliersdwarsstraat gay bar strip.",
    keywords: ["boutique", "canal house", "romantic", "gay-friendly"],
    links: { website: "https://example.com/canal-house-rainbow-suites", booking: "https://example.com/book/canal-house-rainbow-suites" },
    photos: ["https://picsum.photos/seed/ams-hotel-1/640/400"],
    rating: 4.8,
  },
  {
    id: "ams-bar-1",
    name: "Velvet Anchor Bar",
    city: "Amsterdam",
    country: "Netherlands",
    locationType: "bar",
    description:
      "Cozy, welcoming gay bar with a mixed crowd, popular for its Sunday afternoon sing-alongs.",
    keywords: ["gay bar", "cozy", "mixed crowd", "nightlife"],
    links: { website: "https://example.com/velvet-anchor-bar" },
    photos: ["https://picsum.photos/seed/ams-bar-1/640/400"],
    rating: 4.5,
  },
  {
    id: "ptown-hotel-1",
    name: "Dune Shore Guesthouse",
    city: "Provincetown",
    country: "United States",
    locationType: "hotel",
    description:
      "Classic P-town guesthouse a block from Commercial Street, adults-only, clothing-optional sundeck.",
    keywords: ["guesthouse", "commercial street", "romantic", "lgbtq-owned"],
    links: { website: "https://example.com/dune-shore-guesthouse", booking: "https://example.com/book/dune-shore-guesthouse" },
    photos: ["https://picsum.photos/seed/ptown-hotel-1/640/400"],
    rating: 4.7,
  },
  {
    id: "ptown-event-1",
    name: "Provincetown Pride Carnival Week",
    city: "Provincetown",
    country: "United States",
    locationType: "event",
    description:
      "Annual mid-August week of parades, themed parties, and beach events celebrating Provincetown's LGBTQ+ community.",
    keywords: ["pride", "carnival", "parade", "festival", "august"],
    links: { website: "https://example.com/ptown-carnival-week" },
    photos: ["https://picsum.photos/seed/ptown-event-1/640/400"],
    rating: 4.9,
  },
  {
    id: "cpt-restaurant-1",
    name: "Table Bay Rainbow Rooftop",
    city: "Cape Town",
    country: "South Africa",
    locationType: "restaurant",
    description:
      "Rooftop restaurant in De Waterkant with Table Mountain views, a favorite for LGBTQ+ travelers for its relaxed, welcoming atmosphere.",
    keywords: ["rooftop", "romantic dinner", "de waterkant", "views"],
    links: { website: "https://example.com/table-bay-rainbow-rooftop" },
    photos: ["https://picsum.photos/seed/cpt-restaurant-1/640/400"],
    rating: 4.6,
  },
  {
    id: "cpt-bar-1",
    name: "De Waterkant Social Club",
    city: "Cape Town",
    country: "South Africa",
    locationType: "bar",
    description:
      "Cape Town's most established gay bar, in the heart of the De Waterkant \"Gay Village\", known for its Friday drag brunch.",
    keywords: ["gay village", "drag brunch", "nightlife", "de waterkant"],
    links: { website: "https://example.com/de-waterkant-social-club" },
    photos: ["https://picsum.photos/seed/cpt-bar-1/640/400"],
    rating: 4.5,
  },
  {
    id: "bue-hotel-1",
    name: "Palermo Soho Pride Hotel",
    city: "Buenos Aires",
    country: "Argentina",
    locationType: "hotel",
    description:
      "Design hotel in trendy Palermo Soho, close to the city's gay nightlife and a short walk to leafy Plaza Serrano.",
    keywords: ["design hotel", "palermo soho", "gay-friendly", "nightlife"],
    links: { website: "https://example.com/palermo-soho-pride-hotel", booking: "https://example.com/book/palermo-soho-pride-hotel" },
    photos: ["https://picsum.photos/seed/bue-hotel-1/640/400"],
    rating: 4.6,
  },
  {
    id: "bue-venue-1",
    name: "Milonga Rosa Tango Venue",
    city: "Buenos Aires",
    country: "Argentina",
    locationType: "venue",
    description:
      "Queer-friendly tango milonga where same-sex couples dance without a second glance — beginner lessons before every session.",
    keywords: ["tango", "milonga", "queer-friendly", "dance"],
    links: { website: "https://example.com/milonga-rosa" },
    photos: ["https://picsum.photos/seed/bue-venue-1/640/400"],
    rating: 4.8,
  },
];

// City/country/category are matched as exact fields so a bare category word
// like "bar" (which also collides with plenty of venue names/keywords as a
// substring) doesn't inflate the score of unrelated cities as much as an
// actual city/country match. Name/keyword substring matches require a
// slightly longer token so short category words don't dominate there either.
function scoreOf(place: PlaceRecord, tokens: string[]): number {
  const city = place.city.toLowerCase();
  const country = place.country.toLowerCase();
  const name = place.name.toLowerCase();
  const locationType = place.locationType.toLowerCase();
  const keywords = place.keywords.map((keyword) => keyword.toLowerCase());

  return tokens.reduce((score, token) => {
    if (city === token) score += 8;
    if (country === token) score += 5;
    if (locationType === token) score += 3;
    if (token.length >= 4 && name.includes(token)) score += 2;
    if (token.length >= 4 && keywords.some((keyword) => keyword.includes(token))) score += 1;
    return score;
  }, 0);
}

class MockRetriever implements Retriever {
  async search(query: string, topN = 5): Promise<SearchHit[]> {
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);

    const scored = PLACES.map((place) => ({ id: place.id, score: scoreOf(place, tokens) })).filter(
      (hit) => hit.score > 0,
    );
    if (scored.length === 0) return [];

    // Drop generic-keyword-only noise once at least one strong (city/country/name) match exists.
    const maxScore = Math.max(...scored.map((hit) => hit.score));
    return scored
      .filter((hit) => hit.score >= maxScore * 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  async getDetails(ids: string[]): Promise<PlaceRecord[]> {
    const idSet = new Set(ids);
    return PLACES.filter((place) => idSet.has(place.id));
  }
}

export const mockRetriever: Retriever = new MockRetriever();
