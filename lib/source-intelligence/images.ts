import type { WebImage } from "../../types/research";

type OpenverseImage = { id?: string; title?: string; thumbnail?: string; url?: string; foreign_landing_url?: string; creator?: string; alt?: string };
type OpenverseResponse = { results?: OpenverseImage[] };
type GoogleImageItem = { link?: string; image?: { contextLink?: string; thumbnailLink?: string }; title?: string; snippet?: string };
type GoogleImageResponse = { items?: GoogleImageItem[] };
type CommonsPage = { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string }> };
type CommonsResponse = { query?: { pages?: Record<string, CommonsPage> } };
type RedditImage = { id?: string; title?: string; url?: string; permalink?: string; thumbnail?: string; preview?: { images?: Array<{ source?: { url?: string } }> } };
type RedditResponse = { data?: { children?: Array<{ data?: RedditImage }> } };

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

export async function searchCommonsVisuals(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(limit), prop: "imageinfo", iiprop: "url", iiurlwidth: "720", format: "json", origin: "*" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as CommonsResponse;
    return Object.values(data.query?.pages || {}).map((page) => {
      const image = page.imageinfo?.[0];
      const imageUrl = image?.thumburl || image?.url;
      if (!imageUrl) return null;
      const title = page.title.replace(/^File:/, "");
      return { id: `commons-${page.pageid}`, title, url: imageUrl, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, alt: title, query } satisfies WebImage;
    }).filter((image): image is WebImage => Boolean(image));
  } catch {
    return [];
  }
}

export async function searchRedditVisuals(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit * 3}`, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 public images" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as RedditResponse;
    return (data.data?.children || []).map((entry, index) => {
      const item = entry.data;
      const imageUrl = item?.preview?.images?.[0]?.source?.url?.replaceAll("&amp;", "&") || (item?.thumbnail?.startsWith("http") ? item.thumbnail : item?.url);
      if (!item?.id || !imageUrl || !item.permalink) return null;
      return { id: `reddit-image-${item.id || index}`, title: item.title || query, url: imageUrl, sourceUrl: `https://www.reddit.com${item.permalink}`, alt: item.title || query, query, attribution: "Reddit" } satisfies WebImage;
    }).filter((image): image is WebImage => Boolean(image)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchWebVisuals(query: string, limit = 3): Promise<WebImage[]> {
  const googleImages = await searchGoogleImages(query, limit);
  if (googleImages.length > 0) return googleImages.slice(0, limit);

  const [news, openverse, commons, reddit] = await Promise.all([
    searchGoogleNewsVisuals(query, limit),
    searchOpenverseVisuals(query, limit),
    searchCommonsVisuals(query, limit),
    searchRedditVisuals(query, limit),
  ]);
  return [...news, ...openverse, ...commons, ...reddit].slice(0, limit);
}
