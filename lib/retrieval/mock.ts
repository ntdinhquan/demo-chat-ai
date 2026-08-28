import type { PlaceRecord, Retriever, SearchHit } from "./types";

/**
 * Hardcoded LGBTQ+-friendly places, standing in for a real vector DB +
 * Postgres. All names/links below are fictional demo data, not real
 * businesses. Spans the six cities used for continuity with the eval
 * project's test data (Bangkok, Berlin, Amsterdam, Provincetown, Cape Town,
 * Buenos Aires), plus Tokyo, Osaka, Madrid, London, Mexico City, and Sydney.
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
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
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
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/bue-venue-1/640/400"],
    rating: 4.8,
  },
  {
    id: "tyo-hotel-1",
    name: "Ni-chome Rainbow Stay",
    city: "Tokyo",
    country: "Japan",
    locationType: "hotel",
    description:
      "Compact, design-forward hotel steps from Shinjuku Ni-chome, Asia's densest concentration of gay bars, with LGBTQ+-trained front desk staff.",
    keywords: ["gay-friendly", "shinjuku", "ni-chome", "boutique"],
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/tyo-hotel-1/640/400"],
    rating: 4.5,
  },
  {
    id: "tyo-bar-1",
    name: "Neon Alley Bar",
    city: "Tokyo",
    country: "Japan",
    locationType: "bar",
    description:
      "Tiny, welcoming snack bar tucked in the alleys of Shinjuku Ni-chome — English-friendly owner, karaoke machine, standing room only most nights.",
    keywords: ["gay bar", "ni-chome", "nightlife", "karaoke"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/tyo-bar-1/640/400"],
    rating: 4.6,
  },
  {
    id: "tyo-restaurant-1",
    name: "Rainbow Izakaya Yoi",
    city: "Tokyo",
    country: "Japan",
    locationType: "restaurant",
    description:
      "Casual izakaya near Ni-chome popular with the local gay community for late-night skewers and sake after the bars.",
    keywords: ["izakaya", "ni-chome", "late-night", "gay-friendly"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/tyo-restaurant-1/640/400"],
    rating: 4.4,
  },
  {
    id: "tyo-event-1",
    name: "Tokyo Rainbow Pride",
    city: "Tokyo",
    country: "Japan",
    locationType: "event",
    description:
      "Japan's largest Pride festival, held every spring in Yoyogi Park with a parade through Shibuya and Harajuku.",
    keywords: ["pride", "parade", "festival", "yoyogi park", "april"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/tyo-event-1/640/400"],
    rating: 4.8,
  },
  {
    id: "osa-bar-1",
    name: "Doyama Rainbow Lounge",
    city: "Osaka",
    country: "Japan",
    locationType: "bar",
    description:
      "Friendly lounge bar in Osaka's Doyama-cho gay district, known for a mixed international crowd and weekend DJ sets.",
    keywords: ["gay bar", "doyama", "nightlife", "lounge"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/osa-bar-1/640/400"],
    rating: 4.4,
  },
  {
    id: "mad-hotel-1",
    name: "Chueca Boutique Suites",
    city: "Madrid",
    country: "Spain",
    locationType: "hotel",
    description:
      "Stylish suites in the heart of Chueca, Madrid's historic gay neighborhood, a short walk from the Pride parade route.",
    keywords: ["gay-friendly", "chueca", "boutique", "central"],
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/mad-hotel-1/640/400"],
    rating: 4.7,
  },
  {
    id: "mad-bar-1",
    name: "Plaza Chueca Terrace Bar",
    city: "Madrid",
    country: "Spain",
    locationType: "bar",
    description:
      "Buzzy terrace bar right on Plaza de Chueca, a classic starting point for a night out in Madrid's gay quarter.",
    keywords: ["gay bar", "chueca", "terrace", "nightlife"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/mad-bar-1/640/400"],
    rating: 4.5,
  },
  {
    id: "lon-hotel-1",
    name: "Soho Pride Townhouse",
    city: "London",
    country: "United Kingdom",
    locationType: "hotel",
    description:
      "Converted Georgian townhouse hotel on the edge of Soho, London's longtime gay village, minutes from Old Compton Street.",
    keywords: ["gay-friendly", "soho", "old compton street", "townhouse"],
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/lon-hotel-1/640/400"],
    rating: 4.6,
  },
  {
    id: "lon-bar-1",
    name: "Old Compton Social",
    city: "London",
    country: "United Kingdom",
    locationType: "bar",
    description:
      "Long-standing gay bar on Old Compton Street with big street-facing windows and a lively pre-club crowd.",
    keywords: ["gay bar", "soho", "old compton street", "nightlife"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/lon-bar-1/640/400"],
    rating: 4.5,
  },
  {
    id: "mex-hotel-1",
    name: "Zona Rosa Rainbow Hotel",
    city: "Mexico City",
    country: "Mexico",
    locationType: "hotel",
    description:
      "Mid-range hotel in Zona Rosa, Mexico City's main gay neighborhood, close to Amberes street's bars and clubs.",
    keywords: ["gay-friendly", "zona rosa", "central", "mid-range"],
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/mex-hotel-1/640/400"],
    rating: 4.4,
  },
  {
    id: "mex-bar-1",
    name: "Amberes Nightclub",
    city: "Mexico City",
    country: "Mexico",
    locationType: "bar",
    description:
      "High-energy gay club on Calle Amberes in Zona Rosa, with drag shows and reggaeton nights that run until sunrise.",
    keywords: ["gay bar", "zona rosa", "nightlife", "drag show"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/mex-bar-1/640/400"],
    rating: 4.5,
  },
  {
    id: "syd-hotel-1",
    name: "Oxford Street Rainbow Hotel",
    city: "Sydney",
    country: "Australia",
    locationType: "hotel",
    description:
      "Boutique hotel on Sydney's Oxford Street, the traditional heart of the city's gay scene and the Mardi Gras parade route.",
    keywords: ["gay-friendly", "oxford street", "boutique", "mardi gras"],
    links: { website: "https://www.travelgay.com/", booking: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/syd-hotel-1/640/400"],
    rating: 4.7,
  },
  {
    id: "syd-bar-1",
    name: "Oxford Street Social Club",
    city: "Sydney",
    country: "Australia",
    locationType: "bar",
    description:
      "Iconic multi-level gay bar on Oxford Street with drag brunches, karaoke nights, and a rooftop terrace.",
    keywords: ["gay bar", "oxford street", "drag brunch", "nightlife"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/syd-bar-1/640/400"],
    rating: 4.6,
  },
  {
    id: "syd-event-1",
    name: "Sydney Gay and Lesbian Mardi Gras",
    city: "Sydney",
    country: "Australia",
    locationType: "event",
    description:
      "One of the world's largest Pride festivals, culminating in a huge parade down Oxford Street every February/March.",
    keywords: ["pride", "mardi gras", "parade", "festival", "oxford street"],
    links: { website: "https://www.travelgay.com/" },
    photos: ["https://picsum.photos/seed/syd-event-1/640/400"],
    rating: 4.9,
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

    // This mock only covers a handful of cities/countries. If the query names a
    // real place (city/country) that isn't one of them, a bare category or
    // generic-keyword overlap (e.g. "venue", "gay-friendly") can still clear the
    // relative filter below purely by coincidence, surfacing a place with no real
    // connection to what was asked. Require at least one exact city/country hit
    // before trusting any result, rather than falling back to weaker signals.
    const hasCityOrCountryMatch = PLACES.some((place) => {
      const city = place.city.toLowerCase();
      const country = place.country.toLowerCase();
      return tokens.some((token) => city === token || country === token);
    });
    if (!hasCityOrCountryMatch) return [];

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
