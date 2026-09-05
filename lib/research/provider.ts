import type { ResearchSource } from "../../types/research";

export class ResearchSourceProviderError extends Error { constructor(public readonly kind: "SOURCE_PROVIDER_ERROR" | "NO_RESULTS" | "ALL_RESULTS_REJECTED", message: string, public readonly status?: number) { super(message); } }

type WikipediaSearchResponse = { query?: { search?: Array<{ pageid: number; title: string; snippet: string; timestamp?: string }> } };

type WikipediaSummary = { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } }; timestamp?: string };

function cleanSnippet(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

export async function searchResearchSources(query: string, limit = 6, requestId = "unknown"): Promise<ResearchSource[]> {
  const startedAt = Date.now();
  console.info("[Gold AI Research] source search started", { requestId, query, provider: "wikipedia" });
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: String(limit), format: "json", origin: "*" }).toString();
  let response: Response;
  try { response = await fetch(searchUrl, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store", signal: AbortSignal.timeout(8000) }); }
  catch (error) { console.error("[Gold AI Research] source search provider error", { requestId, provider: "wikipedia", error: error instanceof Error ? error.message : "unknown error", durationMs: Date.now() - startedAt }); throw new ResearchSourceProviderError("SOURCE_PROVIDER_ERROR", "Research source provider is unavailable."); }
  if (!response.ok) { console.error("[Gold AI Research] source search provider error", { requestId, provider: "wikipedia", status: response.status, statusText: response.statusText || undefined, durationMs: Date.now() - startedAt }); throw new ResearchSourceProviderError("SOURCE_PROVIDER_ERROR", "Research source provider rejected the request.", response.status); }
  let data: WikipediaSearchResponse;
  try { data = await response.json() as WikipediaSearchResponse; }
  catch { console.error("[Gold AI Research] source search response parse error", { requestId, provider: "wikipedia", status: response.status, durationMs: Date.now() - startedAt }); throw new ResearchSourceProviderError("SOURCE_PROVIDER_ERROR", "Research source provider returned an invalid response.", response.status); }
  if (!data.query || !Array.isArray(data.query.search)) {
    console.error("[Gold AI Research] source search response shape error", { requestId, provider: "wikipedia", status: response.status, responseKeys: Object.keys(data), durationMs: Date.now() - startedAt });
    throw new ResearchSourceProviderError("SOURCE_PROVIDER_ERROR", "Research source provider returned an unexpected response.", response.status);
  }
  const results = data.query.search;
  console.info("[Gold AI Research] source search raw results", { requestId, provider: "wikipedia", status: response.status, rawResults: results.length });
  if (results.length === 0) { console.info("[Gold AI Research] source search no results", { requestId, provider: "wikipedia", acceptedResults: 0, rejectedResults: 0, durationMs: Date.now() - startedAt }); throw new ResearchSourceProviderError("NO_RESULTS", "No research sources were found."); }
  const sources = await Promise.all(results.map(async (result, index) => {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`;
    try {
      const summaryResponse = await fetch(summaryUrl, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      const summary = summaryResponse.ok ? await summaryResponse.json() as WikipediaSummary : {};
      const url = summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`;
      return { id: `source-${index + 1}-${result.pageid}`, title: summary.title || result.title, url, domain: "wikipedia.org", snippet: summary.extract || cleanSnippet(result.snippet), publishedAt: summary.timestamp || result.timestamp, retrievedAt: Date.now(), sourceType: "encyclopedic", relevanceScore: Math.max(0.1, 1 - index / Math.max(limit, 1)) } satisfies ResearchSource;
    } catch {
      return { id: `source-${index + 1}-${result.pageid}`, title: result.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`, domain: "wikipedia.org", snippet: cleanSnippet(result.snippet), publishedAt: result.timestamp, retrievedAt: Date.now(), sourceType: "encyclopedic", relevanceScore: Math.max(0.1, 1 - index / Math.max(limit, 1)) } satisfies ResearchSource;
    }
  }));
  const uniqueSources = sources.filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
  const rejectedResults = results.length - uniqueSources.length;
  console.info("[Gold AI Research] source search completed", { requestId, provider: "wikipedia", rawResults: results.length, acceptedResults: uniqueSources.length, rejectedResults, rejectionReasons: uniqueSources.length < sources.length ? ["duplicate_url"] : [], durationMs: Date.now() - startedAt });
  if (uniqueSources.length === 0) throw new ResearchSourceProviderError("ALL_RESULTS_REJECTED", "Research sources could not be normalized.");
  return uniqueSources;
}
