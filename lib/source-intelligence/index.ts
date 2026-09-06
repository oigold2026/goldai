import { searchResearchSources } from "../research/provider";
import type { ResearchSource, WebImage } from "../../types/research";
import { searchWikimediaVisuals } from "./images";

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

const freshnessPattern = /\b(latest|current|today|now|recent|recently|this week|this month|202\d|breaking|price|score|weather|status|news|update|net worth|wealth|valuation|stock|ceo|president|king|monarch|royal|what happened|about him|about her)\b/i;
const imagePattern = /\b(look like|show me|image|picture|photo|visual|landmark|place|destination|animal|plant|tree|flower|product|architecture|building|artwork|painting|specimen|mountain|tower|person|who is|king|monarch|royal|tooro|toro)\b/i;

export function planSourceQuery(query: string): SourcePlan {
  const normalized = query.toLowerCase();
  let queryType: QueryType = "general";
  if (/\b(latest|breaking|news|election|score|weather|current events)\b/.test(normalized)) queryType = "news";
  else if (/\b(academic|research|study|paper|journal|evidence)\b/.test(normalized)) queryType = "academic";
  else if (/\b(code|coding|program|programming|api|next\.js|react|typescript|javascript|python|github|debug)\b/.test(normalized)) queryType = "technical";
  else if (/\b(net worth|wealth|stock|share|finance|financial|market|investment|revenue|valuation)\b/.test(normalized)) queryType = "finance";
  else if (/\b(who is|biography|born|founder|ceo|president|person|king|monarch|royal|tooro|toro)\b/.test(normalized)) queryType = "people";
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
  const preferredSources = queryType === "technical" ? ["official-documentation", "github", "encyclopedic"] : queryType === "academic" ? ["crossref", "institutional", "encyclopedic"] : ["news", "official", "live-web", "encyclopedic"];
  return { queryType, requiresFreshness: requiresFreshness || ["people", "news", "finance"].includes(queryType), preferredSources, sourceCount: requiresFreshness || ["academic", "technical", "health", "finance", "people", "news"].includes(queryType) ? 5 : 3, imageSearchUseful: imagePattern.test(query) || ["geography", "travel", "animals", "plants", "products", "people", "visual", "history", "culture"].includes(queryType) };
}

function uniqueSources(sources: ResearchSource[]) {
  return sources.filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
}

function queryTerms(query: string) {
  return query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((term) => term.length > 2 && !["what", "who", "where", "when", "tell", "about", "latest", "current", "news", "any", "something"].includes(term));
}

function relevanceScore(source: ResearchSource, query: string) {
  const terms = queryTerms(query);
  if (terms.length === 0) return 0.5;
  const haystack = `${source.title} ${source.snippet} ${source.domain}`.toLowerCase();
  return terms.filter((term) => haystack.includes(term)).length / terms.length;
}

function filterRelevantSources(sources: ResearchSource[], query: string) {
  return sources.map((source) => ({ ...source, relevanceScore: Math.max(source.relevanceScore || 0, relevanceScore(source, query)) })).filter((source) => (source.relevanceScore || 0) >= 0.2);
}

function sourceAuthority(source: ResearchSource) {
  const domain = source.domain.toLowerCase();
  if (domain.endsWith(".gov") || domain.includes("go.ug") || domain.includes("uneb") || domain.includes("ncdc") || domain.includes("ubos")) return 7;
  if (domain.endsWith(".edu") || domain.includes("ac.ug") || source.sourceType === "academic") return 6;
  if (["reuters.com", "bbc.com", "bbc.co.uk", "apnews.com", "cnn.com"].includes(domain)) return 5;
  if (source.sourceType === "official") return 5;
  if (source.sourceType === "news") return 4;
  if (domain === "wikipedia.org") return 2;
  return 3;
}

function rankSources(sources: ResearchSource[], plan: SourcePlan) {
  return [...sources].sort((left, right) => {
    const leftAuthority = sourceAuthority(left);
    const rightAuthority = sourceAuthority(right);
    const leftFreshness = left.publishedAt ? Date.parse(left.publishedAt) || 0 : 0;
    const rightFreshness = right.publishedAt ? Date.parse(right.publishedAt) || 0 : 0;
    const freshnessWeight = plan.requiresFreshness ? 0.000001 : 0.0000001;
    return (rightAuthority - leftAuthority) * 100 + ((right.relevanceScore || 0) - (left.relevanceScore || 0)) * 10 + (rightFreshness - leftFreshness) * freshnessWeight;
  });
}

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

async function searchGoogleNews(query: string, limit: number): Promise<ResearchSource[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((match, index) => {
      const item = match[1];
      const read = (tag: string) => decodeXml(item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] || "");
      const title = read("title");
      const link = read("link");
      const description = read("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const publishedAt = read("pubDate");
      const publisher = item.match(/<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i);
      let domain = "news.google.com";
      try { if (publisher?.[1]) domain = new URL(publisher[1]).hostname.replace(/^www\./, ""); } catch { }
      const sourceType = domain.endsWith(".gov") || domain.includes("go.ug") || domain.includes("uneb") || domain.includes("ncdc") || domain.includes("ubos") || domain.endsWith(".edu") || domain.includes("ac.ug") ? "official" as const : "news" as const;
      return { id: `google-news-${index}-${encodeURIComponent(link)}`, title, url: link, domain, snippet: description || title, publishedAt, retrievedAt: Date.now(), sourceType, relevanceScore: 0.8 };
    }).filter((source) => source.title && /^https?:\/\//.test(source.url));
  } catch { return []; }
}

async function searchCrossref(query: string, limit: number): Promise<ResearchSource[]> {
  try {
    const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&select=DOI,title,URL,published,author`, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as { message?: { items?: Array<{ DOI?: string; title?: string[]; URL?: string; published?: { dateParts?: number[][] } }> } };
    return (data.message?.items || []).filter((item) => item.DOI && item.title?.[0] && item.URL).map((item, index) => ({ id: `crossref-${index}-${item.DOI}`, title: item.title![0], url: item.URL!, domain: "doi.org", snippet: "Academic publication indexed by Crossref.", publishedAt: item.published?.dateParts?.[0]?.join("-"), retrievedAt: Date.now(), sourceType: "academic" as const, relevanceScore: 0.9 }));
  } catch { return []; }
}

async function searchGitHub(query: string, limit: number): Promise<ResearchSource[]> {
  try {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as { items?: Array<{ id: number; name: string; html_url: string; description?: string; updated_at?: string }> };
    return (data.items || []).map((item) => ({ id: `github-${item.id}`, title: item.name, url: item.html_url, domain: "github.com", snippet: item.description || "Official project repository.", publishedAt: item.updated_at, retrievedAt: Date.now(), sourceType: "technical" as const, relevanceScore: 0.9 }));
  } catch { return []; }
}

function visualSubject(query: string) {
  return query.replace(/\b(what is|who is|tell me about|current|latest|today|now|recent|net worth|wealth|valuation|and|his|her|their|show me|pictures? of|photos? of)\b/gi, " ").replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim() || query;
}

export async function retrieveSourceIntelligence(query: string, requestId: string): Promise<SourceIntelligenceResult> {
  const plan = planSourceQuery(query);
  const startedAt = Date.now();
  if (process.env.NODE_ENV !== "production") console.info("[GoldAI] searchStarted", { requestId, query, classification: plan.queryType, requiresFreshness: plan.requiresFreshness });
  const searches: Array<Promise<ResearchSource[]>> = [searchResearchSources(query, plan.sourceCount, requestId).catch(() => [])];
  if (plan.requiresFreshness || ["news", "finance", "business", "people", "education", "health", "products", "geography"].includes(plan.queryType)) searches.push(searchGoogleNews(query, 6));
  if (plan.queryType === "academic") searches.push(searchCrossref(query, 3));
  if (plan.queryType === "technical") searches.push(searchGitHub(query, 3));
  const sources = rankSources(filterRelevantSources(uniqueSources((await Promise.all(searches)).flat()), query), plan).slice(0, plan.sourceCount);
  const images = [];
  if (process.env.NODE_ENV !== "production") console.info("[GoldAI] searchCompleted", { requestId, sourcesFound: sources.length, imagesFound: images.length, durationMs: Date.now() - startedAt });
  return { plan, sources, images };
}

function responseVisualQuery(userQuery: string, response: string) {
  const cleanResponse = response.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/[*_#`]/g, " ").replace(/\s+/g, " ").trim();
  const namedEntities = [...cleanResponse.matchAll(/\b(?:[A-Z][\w'’-]*)(?:\s+(?:[A-Z][\w'’-]*|of|the|Kingdom|King|Kingdom|Uganda|Ugandan)){1,6}/g)].map((match) => match[0].trim()).filter((value, index, values) => values.indexOf(value) === index).sort((left, right) => right.length - left.length);
  const subject = namedEntities[0] || visualSubject(userQuery);
  return `${subject} ${/\b(king|queen|person|dancer|place|landmark|animal|plant|product|building|event|organization|company)\b/i.test(cleanResponse) ? "official relevant image" : "relevant image"}`.trim();
}

export async function retrieveImagesForResponse(userQuery: string, response: string, requestId: string): Promise<WebImage[]> {
  const query = responseVisualQuery(userQuery, response);
  if (process.env.NODE_ENV !== "production") console.info("[GoldAI Image Pipeline] query", { requestId, query });
  const images = await searchWikimediaVisuals(query, 3);
  if (process.env.NODE_ENV !== "production") console.info("[GoldAI Image Pipeline] results", { requestId, count: images.length });
  return images;
}

export function sourceContext(sources: ResearchSource[]) {
  return sources.slice(0, 5).map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\nSource type/domain: ${source.sourceType || "web"}/${source.domain}\nPublished or updated: ${source.publishedAt || "not provided"}\nRetrieved: ${new Date(source.retrievedAt).toISOString()}\n${source.snippet.slice(0, 900)}`).join("\n\n");
}
