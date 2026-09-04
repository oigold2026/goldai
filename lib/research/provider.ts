import type { ResearchSource } from "../../types/research";

type WikipediaSearchResponse = { query?: { search?: Array<{ pageid: number; title: string; snippet: string; timestamp?: string }> } };

type WikipediaSummary = { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } }; timestamp?: string };

function cleanSnippet(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

export async function searchResearchSources(query: string, limit = 6): Promise<ResearchSource[]> {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.search = new URLSearchParams({ action: "query", list: "search", srsearch: query, srlimit: String(limit), format: "json", origin: "*" }).toString();
  const response = await fetch(searchUrl, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store" });
  if (!response.ok) throw new Error("Research source search failed.");
  const data = await response.json() as WikipediaSearchResponse;
  const results = data.query?.search || [];
  const sources = await Promise.all(results.map(async (result, index) => {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`;
    try {
      const summaryResponse = await fetch(summaryUrl, { headers: { Accept: "application/json", "User-Agent": "GoldAI/1.0 research" }, cache: "no-store" });
      const summary = summaryResponse.ok ? await summaryResponse.json() as WikipediaSummary : {};
      const url = summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`;
      return { id: `source-${index + 1}-${result.pageid}`, title: summary.title || result.title, url, domain: "wikipedia.org", snippet: summary.extract || cleanSnippet(result.snippet), publishedAt: summary.timestamp || result.timestamp, retrievedAt: Date.now() } satisfies ResearchSource;
    } catch {
      return { id: `source-${index + 1}-${result.pageid}`, title: result.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`, domain: "wikipedia.org", snippet: cleanSnippet(result.snippet), publishedAt: result.timestamp, retrievedAt: Date.now() } satisfies ResearchSource;
    }
  }));
  return sources.filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
}
