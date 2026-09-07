import type { WebImage } from "../../types/research";

type GoogleImageItem = { link?: string; image?: { contextLink?: string; thumbnailLink?: string }; title?: string; snippet?: string };
type GoogleImageResponse = { items?: GoogleImageItem[] };
type OpenverseResponse = { results?: Array<{ id?: string; title?: string; thumbnail?: string; foreign_landing_url?: string; creator?: string; alt?: string }> };
type CommonsResponse = { query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> } };

export class GoogleImagePermissionError extends Error {}

export async function searchGoogleImages(query: string, limit = 3): Promise<WebImage[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !searchEngineId) {
    console.warn("[Gold AI Image Search] Google Images is not configured", { hasApiKey: Boolean(apiKey), hasSearchEngineId: Boolean(searchEngineId) });
    return [];
  }
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.search = new URLSearchParams({ key: apiKey, cx: searchEngineId, q: query, searchType: "image", num: String(Math.min(limit, 10)), safe: "active", imgSize: "large" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: { status?: string; message?: string } } | null;
      console.warn("[Gold AI Image Search] Google Images request failed", { query, status: response.status, reason: errorBody?.error?.status || errorBody?.error?.message || response.statusText });
      if (response.status === 401 || response.status === 403) throw new GoogleImagePermissionError("Google Images API is not authorized. Check the Custom Search JSON API, API key restrictions, billing, and CSE ID.");
      return [];
    }
    const data = await response.json() as GoogleImageResponse;
    const images = (data.items || []).filter((item) => item.link && item.image?.contextLink).map((item, index) => ({
      id: `google-image-${index}-${encodeURIComponent(query)}`,
      title: item.title || query,
      url: item.image?.thumbnailLink || item.link!,
      sourceUrl: item.image!.contextLink!,
      alt: item.title || item.snippet || query,
      query,
    }));
    console.info("[Gold AI Image Search] Google Images results", { query, count: images.length });
    return images;
  } catch (error) {
    if (error instanceof GoogleImagePermissionError) throw error;
    console.warn("[Gold AI Image Search] Google Images request could not be completed", { query });
    return [];
  }
}

async function searchOpenverseImages(query: string, limit: number): Promise<WebImage[]> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.search = new URLSearchParams({ q: query, page_size: String(limit), mature: "false" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as OpenverseResponse;
    return (data.results || []).filter((item) => item.thumbnail && item.foreign_landing_url).map((item, index) => ({ id: `openverse-${item.id || index}`, title: item.title || query, url: item.thumbnail!, sourceUrl: item.foreign_landing_url!, alt: item.alt || item.title || query, query, attribution: item.creator }));
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
  try {
    const googleImages = await searchGoogleImages(query, limit);
    if (googleImages.length > 0) return googleImages.slice(0, limit);
  } catch (error) {
    if (error instanceof GoogleImagePermissionError) console.warn("[Gold AI Image Search] Google unavailable; using fallback providers", { query });
  }
  const [openverseImages, commonsImages] = await Promise.all([searchOpenverseImages(query, limit), searchCommonsImages(query, limit)]);
  return [...openverseImages, ...commonsImages].slice(0, limit);
}
