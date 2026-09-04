import { searchResearchSources } from "../research/provider";

const currentFactPattern = /\b(current|currently|latest|newest|today|now|as of|this year|2026|president|prime minister|ceo|richest|price|population|winner|champion|score|ranked|ranking|stock|election|weather)\b/i;

export function needsCurrentFacts(message: string) {
  return currentFactPattern.test(message);
}

export async function getCurrentFactsContext(message: string, requestId: string) {
  if (!needsCurrentFacts(message)) return "";
  try {
    const sources = await searchResearchSources(message, 4, requestId);
    const retrievedAt = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date());
    const sourceContext = sources.map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\n${source.snippet}`).join("\n\n");
    return `\n\nLive factual context retrieved ${retrievedAt} UTC. Prefer these sources for time-sensitive claims, distinguish source-supported facts from estimates, and say when the sources do not establish a reliable current answer. Cite relevant sources as [1], [2], etc.\n\n${sourceContext}`;
  } catch {
    return `\n\nThe user is asking for potentially time-sensitive information. Use the current date ${new Date().toISOString().slice(0, 10)} only as context, do not present uncertain or outdated information as current, and state clearly when you cannot verify a latest fact.`;
  }
}