import type { WebImage } from "../../types/research";

type OpenverseResponse = { results?: Array<{ id?: string; title?: string; thumbnail?: string; url?: string; foreign_landing_url?: string; creator?: string; alt?: string }> };
type CommonsResponse = { query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> } };
type WikipediaSummaryResponse = { title?: string; thumbnail?: { source?: string }; content_urls?: { desktop?: { page?: string } } };

async function searchOpenverseImages(query: string, limit: number): Promise<WebImage[]> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.search = new URLSearchParams({ q: query, page_size: String(limit), mature: "false" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as OpenverseResponse;
    return (data.results || []).filter((item) => (item.thumbnail || item.url) && item.foreign_landing_url).map((item, index) => ({ id: `openverse-${item.id || index}`, title: item.title || query, url: item.thumbnail || item.url!, sourceUrl: item.foreign_landing_url!, alt: item.alt || item.title || query, query, attribution: item.creator }));
  } catch { return []; }
}

async function searchWikipediaImage(query: string): Promise<WebImage[]> {
  try {
    const title = encodeURIComponent(query.replace(/\b(portrait|official photo|photo|images?)\b/gi, " ").replace(/\s+/g, " ").trim());
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as WikipediaSummaryResponse;
    const imageUrl = data.thumbnail?.source;
    const sourceUrl = data.content_urls?.desktop?.page;
    return imageUrl && sourceUrl ? [{ id: `wikipedia-image-${encodeURIComponent(query)}`, title: data.title || query, url: imageUrl, sourceUrl, alt: data.title || query, query }] : [];
  } catch { return []; }
}

async function searchCommonsImages(query: string, limit: number): Promise<WebImage[]> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(limit), prop: "imageinfo", iiprop: "url", iiurlwidth: "720", format: "json", origin: "*" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as CommonsResponse;
    return Object.values(data.query?.pages || {}).map((page) => { const image = page.imageinfo?.[0]; const title = page.title.replace(/^File:/, ""); const url = image?.thumburl || image?.url; return url ? { id: `commons-${page.pageid}`, title, url, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, alt: title, query } : null; }).filter((item): item is WebImage => Boolean(item));
  } catch { return []; }
}

export async function searchWebVisuals(query: string, limit = 3): Promise<WebImage[]> {
  const [openverseImages, commonsImages, wikipediaImages] = await Promise.all([searchOpenverseImages(query, limit), searchCommonsImages(query, limit), searchWikipediaImage(query)]);
  const fallbackImages = [...openverseImages, ...commonsImages, ...wikipediaImages].slice(0, limit);
  console.info("[Gold AI Image Search] fallback results", { query, count: fallbackImages.length });
  return fallbackImages;
}
