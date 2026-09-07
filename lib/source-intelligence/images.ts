import type { WebImage } from "../../types/research";

type GoogleImageItem = { link?: string; image?: { contextLink?: string; thumbnailLink?: string }; title?: string; snippet?: string };
type GoogleImageResponse = { items?: GoogleImageItem[] };

export async function searchGoogleImages(query: string, limit = 3): Promise<WebImage[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !searchEngineId) return [];
  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.search = new URLSearchParams({ key: apiKey, cx: searchEngineId, q: query, searchType: "image", num: String(Math.min(limit, 10)), safe: "active" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as GoogleImageResponse;
    return (data.items || []).filter((item) => item.link && item.image?.contextLink).map((item, index) => ({
      id: `google-image-${index}-${encodeURIComponent(query)}`,
      title: item.title || query,
      url: item.link!,
      sourceUrl: item.image!.contextLink!,
      alt: item.title || item.snippet || query,
      query,
    }));
  } catch {
    return [];
  }
}

export async function searchWebVisuals(query: string, limit = 3): Promise<WebImage[]> {
  return searchGoogleImages(query, limit);
}
