import type { WebImage } from "../../types/research";

type GoogleImageItem = { link?: string; image?: { contextLink?: string; thumbnailLink?: string }; title?: string; snippet?: string };
type GoogleImageResponse = { items?: GoogleImageItem[] };

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
  } catch {
    console.warn("[Gold AI Image Search] Google Images request could not be completed", { query });
    return [];
  }
}

export async function searchWebVisuals(query: string, limit = 3): Promise<WebImage[]> {
  return searchGoogleImages(query, limit);
}
