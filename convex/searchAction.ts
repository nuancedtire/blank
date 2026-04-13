import { v } from "convex/values";
import { action } from "./_generated/server";
import Exa from "exa-js";

type WebResultSource = {
  url?: string;
  title?: string | null;
  text?: string | null;
  highlights?: string[] | null;
};

type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  kind: string;
  host: string;
  pageTitle?: string;
  details?: string;
  relatedResults?: Array<{
    title: string;
    url: string;
    kind: string;
    host: string;
    source: string;
  }>;
};

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function readableHost(url: string): string {
  return hostnameFromUrl(url).replace(/^www\./, "");
}

function labelForUrl(
  url: string,
  domains: Array<{ domain: string; label: string }>,
): string {
  const host = hostnameFromUrl(url);
  return (
    domains.find(
      (entry) => host === entry.domain || host.endsWith(`.${entry.domain}`),
    )?.label ?? "External"
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseWords(value: string): string {
  const lowerWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);
  return value
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      const normalized = word.toLowerCase();
      if (index > 0 && lowerWords.has(normalized)) {
        return normalized;
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

function deriveTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const raw = segments[segments.length - 1] ?? parsed.hostname;
    const withoutExtension = raw.replace(/\.pdf$/i, "");
    const withoutTrailingId = withoutExtension.replace(/-\d{5,}$/g, "");
    const cleaned = normalizeWhitespace(
      withoutTrailingId
        .replace(/^resources-/i, "")
        .replace(/^guidance-/i, "")
        .replace(/(?:[-_ ]\d{1,2})$/, "")
        .replace(/[-_]+/g, " ")
        .replace(/\bpdf\b/gi, " ")
        .replace(/\bevidence\b/gi, "evidence")
        .replace(/\s+/g, " "),
    );
    return cleaned ? titleCaseWords(cleaned) : parsed.hostname;
  } catch {
    return "Untitled guidance";
  }
}

function normalizeTitle(rawTitle: string | null | undefined, url: string): string {
  const title = normalizeWhitespace(rawTitle ?? "");
  if (!title) return deriveTitleFromUrl(url);

  const parts = title
    .split("|")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  const cleanedParts = parts.filter(
    (part) => !["nice", "rcem", "guidance", "context"].includes(part.toLowerCase()),
  );
  const candidate = normalizeWhitespace(
    (cleanedParts[0] ?? parts[0] ?? "")
      .replace(/\s+-\s+(nice|rcem)$/i, ""),
  );
  return candidate || deriveTitleFromUrl(url);
}

function normalizeSnippet(
  item: WebResultSource,
  mode: "pdf" | "full",
): string {
  if (mode === "pdf") return "";
  const highlight = item.highlights?.find((entry) => normalizeWhitespace(entry).length > 0);
  if (highlight) return normalizeWhitespace(highlight);
  const text = normalizeWhitespace(item.text ?? "");
  return text ? text.slice(0, 280) : "";
}

function normalizeLongText(value: string | null | undefined): string {
  return normalizeWhitespace((value ?? "").replace(/\s+/g, " "));
}

function cleanExcerptText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/#{1,6}\s*/g, " ")
      .replace(/\|/g, " ")
      .replace(/[_*`]/g, " ")
      .replace(/\b(Evidence updates|Supporting evidence)\b/gi, " ")
      .replace(/\btable of contents\b/gi, " ")
      .replace(/\bdownload pdf\b/gi, " ")
      .replace(/\bopens in new window\b/gi, " ")
      .replace(/\b(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\b(?:\s+\1)+/g, "$1")
      .replace(/\b(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})(?:\s+\1)+/g, "$1")
      .replace(/(?:\b\d+\.\d+(?:\.\d+)?\b\s*){2,}/g, " ")
      .replace(/\b(page last reviewed|last updated|review date)\b[^.]*\.?/gi, " ")
      .replace(/\b(nice|rcem)\.org?\.uk\b/gi, " ")
      .replace(/\s{2,}/g, " "),
  );
}

function compactExcerpt(value: string, maxLength: number): string {
  const normalized = cleanExcerptText(normalizeLongText(value));
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const trimmed = normalized.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

function removeLeadingTitleEcho(value: string, title: string): string {
  const normalizedTitle = cleanExcerptText(title).toLowerCase();
  const normalizedValue = cleanExcerptText(value);
  if (!normalizedTitle || !normalizedValue) return normalizedValue;

  const lowered = normalizedValue.toLowerCase();
  if (lowered.startsWith(normalizedTitle)) {
    return normalizeWhitespace(normalizedValue.slice(normalizedTitle.length));
  }
  return normalizedValue;
}

function deriveKind(url: string): string {
  const lower = url.toLowerCase();
  if (looksLikePdfPath(url)) return "PDF guidance";
  if (lower.includes("/chapter/")) return "Guidance chapter";
  if (lower.includes("/evidence/")) return "Evidence";
  if (lower.includes("/resources/")) return "Resource";
  if (lower.includes("/news/")) return "News";
  return "Guidance page";
}

function derivePageTitle(url: string, title: string): string | undefined {
  const candidate = deriveTitleFromUrl(url);
  const normalizedCandidate = stripTrailingGuidanceNoise(candidate).toLowerCase();
  const normalizedTitle = stripTrailingGuidanceNoise(title).toLowerCase();
  if (!normalizedCandidate || normalizedCandidate === normalizedTitle) {
    return undefined;
  }
  if (
    normalizedTitle.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedTitle)
  ) {
    return undefined;
  }
  return candidate;
}

function stripTrailingGuidanceNoise(title: string): string {
  return normalizeWhitespace(
    title
      .replace(/\|\s*(guidance|nice|rcem)$/i, "")
      .replace(/\bcontext\b/gi, "")
      .replace(/\s+-\s+(guidance|nice|rcem)$/i, ""),
  );
}

function deriveGroupKey(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const guidanceIndex = segments.findIndex((segment) => segment === "guidance");
    if (guidanceIndex >= 0 && segments[guidanceIndex + 1]) {
      const guidanceId = segments[guidanceIndex + 1].toLowerCase();
      return `guidance:${guidanceId}`;
    }
  } catch {
    // ignore and fallback to title
  }
  return `title:${stripTrailingGuidanceNoise(title).toLowerCase()}`;
}

function scorePrimaryResult(result: WebSearchResult): number {
  let score = 0;
  const lower = result.url.toLowerCase();
  if (result.kind === "Guidance page") score += 10;
  if (result.kind === "PDF guidance") score += 8;
  if (result.kind === "Guidance chapter") score += 4;
  if (lower.includes("/guidance/") && !lower.includes("/chapter/")) score += 8;
  if (lower.includes("/resources/")) score += 4;
  if (lower.includes("/evidence/")) score -= 8;
  if (result.title.toLowerCase().startsWith("evidence")) score -= 6;
  score += Math.max(0, 120 - result.title.length) / 20;
  return score;
}

function groupFullResults(results: WebSearchResult[]): WebSearchResult[] {
  const grouped = new Map<string, WebSearchResult[]>();
  for (const result of results) {
    const key = deriveGroupKey(result.url, result.title);
    const existing = grouped.get(key) ?? [];
    existing.push(result);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((items) => {
    if (items.length === 1) return items[0];
    const sorted = [...items].sort((a, b) => scorePrimaryResult(b) - scorePrimaryResult(a));
    const primary = sorted[0];
    const related = sorted
      .slice(1)
      .filter((item, index, collection) => {
        const dedupeKey = `${stripTrailingGuidanceNoise(item.title).toLowerCase()}|${item.url}`;
        return collection.findIndex(
          (candidate) =>
            `${stripTrailingGuidanceNoise(candidate.title).toLowerCase()}|${candidate.url}` ===
            dedupeKey,
        ) === index;
      })
      .map((item) => ({
        title: item.title,
        url: item.url,
        kind: item.kind,
        host: item.host,
        source: item.source,
      }));
    return {
      ...primary,
      relatedResults: related,
    };
    })
    .sort((a, b) => scorePrimaryResult(b) - scorePrimaryResult(a));
}

function isLowValuePdf(url: string, title: string): boolean {
  const path = url.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  return (
    !title.trim() ||
    normalizedTitle === "untitled guidance" ||
    (!path.includes("pdf") &&
      !normalizedTitle.includes("guidance") &&
      !normalizedTitle.includes("policy"))
  );
}

function looksLikePdfPath(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".pdf") ||
    lower.includes("/pdf") ||
    lower.includes("-pdf-") ||
    lower.endsWith("-pdf")
  );
}

async function isPdfResult(url: string): Promise<boolean> {
  if (looksLikePdfPath(url)) return true;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return contentType.includes("pdf");
  } catch {
    return false;
  }
}

// AI-powered search action that uses the guideline agent
// This runs as a Convex action (can call external APIs)
export const aiSearch = action({
  args: {
    query: v.string(),
    mode: v.union(v.literal("pdf"), v.literal("full")),
    domains: v.optional(v.array(v.string())),
    threadId: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim();
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(args.pageSize ?? 12)));

    const requestedDomains = Array.from(
      new Set((args.domains ?? []).map((domain) => domain.toLowerCase().trim()).filter(Boolean)),
    );
    const fallbackDomains = [
      { domain: "nice.org.uk", label: "NICE" },
      { domain: "rcem.ac.uk", label: "RCEM" },
    ];
    const configuredDomains =
      requestedDomains.length > 0
        ? requestedDomains.map((domain) => ({
            domain,
            label:
              fallbackDomains.find((entry) => entry.domain === domain)?.label ??
              domain.replace(/^www\./, ""),
          }))
        : fallbackDomains;

    if (args.mode && configuredDomains.length === 0) {
      return {
        results: [],
        source: "web" as const,
        error: "No web domains configured",
        total: 0,
        page,
        pageSize,
      };
    }

    if (configuredDomains.length > 0) {
      try {
        const apiKey = process.env.EXA_API_KEY;
        if (!apiKey) {
          return {
            results: [],
            source: "web" as const,
            error: "EXA_API_KEY is not configured",
            total: 0,
            page,
            pageSize,
          };
        }

        const exa = new Exa(apiKey);
        const fetchCount = Math.min(pageSize * page * (args.mode === "pdf" ? 4 : 2), 32);
        const exaSearch = await exa.search(query, {
          includeDomains: configuredDomains.map((entry) => entry.domain),
          numResults: fetchCount,
          type: "auto",
        });
        const contentsCandidates =
          args.mode === "full"
            ? (exaSearch.results ?? []).slice(0, Math.min(fetchCount, 8))
            : (exaSearch.results ?? []).slice(0, Math.min(fetchCount, 8));
        const contentsByUrl = new Map<string, WebResultSource>();
        if (contentsCandidates.length > 0) {
          const contents = await exa.getContents(
            contentsCandidates
              .map((item) => item.url)
              .filter((url): url is string => typeof url === "string" && url.length > 0),
            {
            text:
              args.mode === "full"
                ? { maxCharacters: 1200 }
                : { maxCharacters: 500 },
            highlights:
              args.mode === "full"
                ? {
                    query,
                    maxCharacters: 280,
                  }
                : {
                    query,
                    maxCharacters: 180,
                  },
            },
          );
          const contentResults = Array.isArray(contents.results)
            ? contents.results
            : Array.isArray(contents)
              ? contents
              : [];
          for (const item of contentResults as WebResultSource[]) {
            const url = item.url ?? "";
            if (!url) continue;
            contentsByUrl.set(url, item);
          }
        }

        const deduped: WebResultSource[] = [];
        const seen = new Set<string>();
        for (const searchItem of exaSearch.results ?? []) {
          const item = (contentsByUrl.get(searchItem.url ?? "") ??
            searchItem) as WebResultSource;
          const url = item.url ?? "";
          if (!url || seen.has(url)) continue;
          const host = hostnameFromUrl(url);
          if (
            !configuredDomains.some(
              (entry) => host === entry.domain || host.endsWith(`.${entry.domain}`),
            )
          ) {
            continue;
          }
          seen.add(url);
          deduped.push(item as WebResultSource);
        }

        const pdfEligibility =
          args.mode === "pdf"
            ? await Promise.all(
                deduped.map(async (item) => ({
                  item,
                  isPdf: item.url ? await isPdfResult(item.url) : false,
                })),
              )
            : deduped.map((item) => ({ item, isPdf: true }));

        const normalized: WebSearchResult[] = pdfEligibility
          .filter(({ isPdf }) => isPdf)
          .map(({ item }) => {
            const url = item.url ?? "";
            const title = normalizeTitle(item.title, url);
            const fullText = removeLeadingTitleEcho(
              cleanExcerptText(normalizeLongText(item.text)),
              title,
            );
            const rawSnippet = removeLeadingTitleEcho(
              normalizeSnippet(item, args.mode),
              title,
            );
            const snippetSource = rawSnippet || fullText;
            const snippet = compactExcerpt(
              snippetSource,
              args.mode === "full" ? 260 : 140,
            );
            const details =
              args.mode === "full" && fullText.length > snippet.length + 120
                ? compactExcerpt(fullText, 420)
                : undefined;
            return {
              title,
              url,
              snippet,
              source: labelForUrl(url, configuredDomains),
              kind: deriveKind(url),
              host: readableHost(url),
              pageTitle: derivePageTitle(url, title),
              details: details && details !== snippet ? details : undefined,
            };
          })
          .filter((item) => {
            if (!item.url) return false;
            if (args.mode !== "pdf") return true;
            return !isLowValuePdf(item.url, item.title);
          });

        const groupedResults =
          args.mode === "full" ? groupFullResults(normalized) : normalized;
        const total = groupedResults.length;
        const results = groupedResults.slice((page - 1) * pageSize, page * pageSize);

        return {
          results,
          source: "web" as const,
          total,
          page,
          pageSize,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          results: [],
          source: "web" as const,
          error: `Web search failed: ${message}`,
          total: 0,
          page,
          pageSize,
        };
      }
    }

    const results = await ctx.runQuery(
      "guidelines:search" as any,
      {
        query,
      },
    );

    return {
      results: results ?? [],
      source: "fulltext" as const,
      total: Array.isArray(results) ? results.length : 0,
      page,
      pageSize,
    };
  },
});
