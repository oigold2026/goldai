import type { WebImage } from "../../types/research";

type OpenverseImage = { id?: string; title?: string; thumbnail?: string; url?: string; foreign_landing_url?: string; creator?: string; alt?: string };
type OpenverseResponse = { results?: OpenverseImage[] };

type NewsImageItem = { title: string; link: string; imageUrl: string; publisher?: string };

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function newsImageItems(xml: string, limit: number): NewsImageItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, limit * 3).map((match) => {
    const item = match[1];
    const read = (tag: string) => decodeXml(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "").trim();
    const link = read("link");
    const mediaUrl = item.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1] || item.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
    return { title: read("title"), link, imageUrl: decodeXml(mediaUrl), publisher: read("source") };
  }).filter((item) => /^https?:\/\//i.test(item.link) && /^https?:\/\//i.test(item.imageUrl));
}

export async function searchGoogleNewsVisuals(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} (photo OR portrait OR images)`)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    return newsImageItems(await response.text(), limit).map((item, index) => ({ id: `google-news-image-${index}-${encodeURIComponent(query)}`, title: item.title || query, url: item.imageUrl, sourceUrl: item.link, alt: item.title || query, query, attribution: item.publisher }));
  } catch {
    return [];
  }
}

export async function searchOpenverseVisuals(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.search = new URLSearchParams({ q: query, page_size: String(limit), mature: "false" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as OpenverseResponse;
    return (data.results || []).filter((image) => image.thumbnail && image.url && image.foreign_landing_url).map((image, index) => ({
      id: `openverse-${image.id || index}-${encodeURIComponent(query)}`,
      title: image.title || query,
      url: image.thumbnail!,
      sourceUrl: image.foreign_landing_url!,
      alt: image.alt || image.title || query,
      query,
      attribution: image.creator || undefined,
    }));
  } catch {
    return [];
  }
}

export async function searchWebVisuals(query: string, limit = 3): Promise<WebImage[]> {
  const [news, openverse] = await Promise.all([
    searchGoogleNewsVisuals(query, limit),
    searchOpenverseVisuals(query, limit),
  ]);
  return [...news, ...openverse].slice(0, limit);
}
