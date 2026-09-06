import type { WebImage } from "../../types/research";

type WikimediaPage = {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    extmetadata?: { Artist?: { value?: string } };
  }>;
};

type WikimediaResponse = { query?: { pages?: Record<string, WikimediaPage> } };

const stopWords = new Set(["what", "who", "where", "when", "tell", "about", "show", "me", "image", "images", "picture", "pictures", "photo", "photos", "the", "and", "for", "with", "from", "this", "that", "current", "latest", "recent", "news", "information"]);

function subjectTerms(query: string) {
  return query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((term) => term.length > 2 && !stopWords.has(term));
}

function imageRelevance(query: string, page: WikimediaPage, image: NonNullable<WikimediaPage["imageinfo"]>[number]) {
  const terms = subjectTerms(query);
  const haystack = `${page.title} ${image.extmetadata?.Artist?.value || ""}`.toLowerCase();
  const matched = terms.filter((term) => haystack.includes(term));
  const score = terms.length === 0 ? 0 : matched.length / terms.length;
  const distinctiveMatch = terms.length <= 1 ? matched.length === 1 : matched.length >= Math.min(2, terms.length);
  return { score, distinctiveMatch };
}

export async function searchWikimediaVisuals(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(limit), prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "720", format: "json", origin: "*" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as WikimediaResponse;
    const images: WebImage[] = [];
    for (const page of Object.values(data.query?.pages || {})) {
      const image = page.imageinfo?.[0];
      const imageUrl = image?.thumburl || image?.url;
      if (!imageUrl) continue;
      const relevance = imageRelevance(query, page, image);
      if (!relevance.distinctiveMatch || relevance.score < 0.6) {
        if (process.env.NODE_ENV !== "production") console.info("[Gold AI Image Search] rejected", { query, candidate: page.title, relevanceScore: relevance.score });
        continue;
      }
      const result: WebImage = { id: `commons-${page.pageid}`, title: page.title.replace(/^File:/, ""), url: imageUrl, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, alt: page.title.replace(/^File:/, ""), query, relevanceScore: relevance.score };
      const attribution = image.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "");
      if (attribution) result.attribution = attribution;
      images.push(result);
    }
    return images;
  } catch {
    return [];
  }
}
