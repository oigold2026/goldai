import { searchResearchSources } from "../research/provider";
import type { ResearchSource, WebImage } from "../../types/research";

export type QueryType = "general" | "current" | "news" | "academic" | "technical" | "business" | "finance" | "geography" | "travel" | "education" | "health" | "products" | "people" | "animals" | "plants" | "history" | "culture" | "visual" | "opinion";

export type SourcePlan = {
  queryType: QueryType;
  requiresFreshness: boolean;
  preferredSources: string[];
  sourceCount: number;
  imageSearchUseful: boolean;
};

export type SourceIntelligenceResult = {
  plan: SourcePlan;
  sources: ResearchSource[];
  images: WebImage[];
};

const freshnessPattern = /\b(latest|current|today|now|recent|recently|this week|this month|202\d|breaking|price|score|weather|status|news|update)\b/i;
const imagePattern = /\b(look like|show me|image|picture|photo|visual|landmark|place|destination|animal|plant|tree|flower|product|architecture|building|artwork|painting|specimen|mountain|tower|person|who is)\b/i;

export function planSourceQuery(query: string): SourcePlan {
  const normalized = query.toLowerCase();
  let queryType: QueryType = "general";
  if (/\b(latest|breaking|news|election|score|weather|current events)\b/.test(normalized)) queryType = "news";
  else if (/\b(academic|research|study|paper|journal|evidence)\b/.test(normalized)) queryType = "academic";
  else if (/\b(code|coding|program|programming|api|next\.js|react|typescript|javascript|python|github|debug)\b/.test(normalized)) queryType = "technical";
  else if (/\b(stock|share|finance|financial|market|investment|revenue)\b/.test(normalized)) queryType = "finance";
  else if (/\b(health|medical|symptom|medicine|disease|treatment)\b/.test(normalized)) queryType = "health";
  else if (/\b(travel|hotel|tour|destination|holiday)\b/.test(normalized)) queryType = "travel";
  else if (/\b(learn|lesson|teaching|student|study plan|education)\b/.test(normalized)) queryType = "education";
  else if (/\b(plant|tree|flower|animal|bird|species|wildlife)\b/.test(normalized)) queryType = /\b(plant|tree|flower)\b/.test(normalized) ? "plants" : "animals";
  else if (/\b(product|phone|laptop|camera|review|buy)\b/.test(normalized)) queryType = "products";
  else if (/\b(opinion|think|reddit|trend|popular)\b/.test(normalized)) queryType = "opinion";
  else if (/\b(where|location|country|city|place|landmark|mountain|tower)\b/.test(normalized)) queryType = "geography";
  else if (/\b(history|historical|culture|cultural|art|artist)\b/.test(normalized)) queryType = /\bhistory|historical\b/.test(normalized) ? "history" : "culture";
  if (imagePattern.test(normalized) && queryType === "general") queryType = "visual";
  const requiresFreshness = freshnessPattern.test(query);
  const preferredSources = queryType === "technical" ? ["official-documentation", "github", "encyclopedic"] : queryType === "academic" ? ["crossref", "institutional", "encyclopedic"] : queryType === "news" || requiresFreshness ? ["live-web", "encyclopedic"] : ["encyclopedic", "reputable-reference"];
  return { queryType, requiresFreshness, preferredSources, sourceCount: requiresFreshness || ["academic", "technical", "health", "finance"].includes(queryType) ? 5 : 3, imageSearchUseful: imagePattern.test(query) || ["geography", "travel", "animals", "plants", "products", "people", "visual", "history", "culture"].includes(queryType) };
}

function uniqueSources(sources: ResearchSource[]) {
  return sources.filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
}

function rankSources(sources: ResearchSource[], plan: SourcePlan) {
  const authority: Record<string, number> = { "doi.org": 5, "github.com": 4, "wikipedia.org": 3 };
  return [...sources].sort((left, right) => {
    const leftAuthority = authority[left.domain] || 2;
    const rightAuthority = authority[right.domain] || 2;
    const leftFreshness = left.publishedAt ? Date.parse(left.publishedAt) || 0 : 0;
    const rightFreshness = right.publishedAt ? Date.parse(right.publishedAt) || 0 : 0;
    const freshnessWeight = plan.requiresFreshness ? 0.000001 : 0.0000001;
    return rightAuthority - leftAuthority || (rightFreshness - leftFreshness) * freshnessWeight;
  });
}

async function searchCrossref(query: string, limit: number): Promise<ResearchSource[]> {
  try {
    const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&select=DOI,title,URL,published,author`, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as { message?: { items?: Array<{ DOI?: string; title?: string[]; URL?: string; published?: { dateParts?: number[][] } }> } };
    return (data.message?.items || []).filter((item) => item.DOI && item.title?.[0] && item.URL).map((item, index) => ({ id: `crossref-${index}-${item.DOI}`, title: item.title![0], url: item.URL!, domain: "doi.org", snippet: "Academic publication indexed by Crossref.", publishedAt: item.published?.dateParts?.[0]?.join("-"), retrievedAt: Date.now() }));
  } catch { return []; }
}

async function searchGitHub(query: string, limit: number): Promise<ResearchSource[]> {
  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as { items?: Array<{ id: number; name: string; html_url: string; description?: string; updated_at?: string }> };
    return (data.items || []).map((item) => ({ id: `github-${item.id}`, title: item.name, url: item.html_url, domain: "github.com", snippet: item.description || "Official project repository.", publishedAt: item.updated_at, retrievedAt: Date.now() }));
  } catch { return []; }
}

async function searchWikimediaImages(query: string, limit = 3): Promise<WebImage[]> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(limit), prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "720", format: "json", origin: "*" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 images" }, cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as { query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string; extmetadata?: { ImageDescription?: { value?: string }; Artist?: { value?: string } } }> }> } };
    return Object.values(data.query?.pages || {}).map((page) => { const image = page.imageinfo?.[0]; return image?.thumburl || image?.url ? { id: `commons-${page.pageid}`, title: page.title.replace(/^File:/, ""), url: image.thumburl || image.url!, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, alt: page.title.replace(/^File:/, ""), attribution: image.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") } : null; }).filter((image): image is WebImage => Boolean(image));
  } catch { return []; }
}

export async function retrieveSourceIntelligence(query: string, requestId: string): Promise<SourceIntelligenceResult> {
  const plan = planSourceQuery(query);
  const searches: Array<Promise<ResearchSource[]>> = [searchResearchSources(query, plan.sourceCount, requestId).catch(() => [])];
  if (plan.queryType === "academic") searches.push(searchCrossref(query, 3));
  if (plan.queryType === "technical") searches.push(searchGitHub(query, 3));
  const sources = rankSources(uniqueSources((await Promise.all(searches)).flat()), plan).slice(0, plan.sourceCount);
  const images = plan.imageSearchUseful ? await searchWikimediaImages(query, 3) : [];
  return { plan, sources, images };
}

export function sourceContext(sources: ResearchSource[]) {
  return sources.map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\nSource type/domain: ${source.domain}\n${source.snippet}`).join("\n\n");
}
