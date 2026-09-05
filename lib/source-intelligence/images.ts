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
      const result: WebImage = { id: `commons-${page.pageid}`, title: page.title.replace(/^File:/, ""), url: imageUrl, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, alt: page.title.replace(/^File:/, "") };
      const attribution = image.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "");
      if (attribution) result.attribution = attribution;
      images.push(result);
    }
    return images;
  } catch {
    return [];
  }
}
