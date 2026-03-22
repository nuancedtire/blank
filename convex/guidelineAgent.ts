import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { cerebras } from "@ai-sdk/cerebras";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import rag from "./rag";
import Exa from "exa-js";

const MAX_KEYWORD_RESULTS = 5;
const MAX_EXCERPT_CHARS = 2000;

// ─── ED Shop-Floor Search Terms ──────────────────────────────────────────────
// Curated corpus of typical ED clinical queries grouped by area.
// Use this to test and tune Exa parameters (numResults, highlights, text limits)
// so that the search quality is validated against real shop-floor language.
export const ED_SHOP_FLOOR_TERMS: Record<string, string[]> = {
  Cardiac: [
    "chest pain rule out ACS troponin",
    "STEMI NSTEMI management",
    "cardiac arrest ROSC post-resuscitation care",
    "acute pulmonary oedema heart failure",
    "atrial fibrillation rate control cardioversion",
  ],
  Respiratory: [
    "COPD acute exacerbation NIV criteria",
    "acute severe life-threatening asthma",
    "pulmonary embolism PERC Wells criteria",
    "community acquired pneumonia CURB-65",
    "tension pneumothorax needle decompression",
  ],
  Neurology: [
    "head injury CT criteria adults NICE",
    "head injury anticoagulated patient warfarin",
    "stroke thrombolysis alteplase criteria",
    "TIA ABCD2 score urgent neurovascular clinic",
    "first seizure status epilepticus management",
    "subarachnoid haemorrhage LP xanthochromia",
    "bacterial meningitis LP antibiotics steroids",
  ],
  Sepsis: [
    "sepsis 6 bundle NEWS2 escalation criteria",
    "septic shock vasopressors noradrenaline",
    "neutropenic sepsis chemotherapy fever",
  ],
  Trauma: [
    "major trauma team activation criteria",
    "C-spine clearance Canadian cervical rule NEXUS",
    "burns Parkland formula airway early intubation",
    "elderly rib fractures analgesia regional nerve block",
  ],
  Paediatric: [
    "febrile child under 5 septic screen antibiotics",
    "febrile convulsion simple vs complex",
    "meningococcal disease petechiae purpura rash",
    "bronchiolitis assessment severity criteria",
    "croup stridor dexamethasone nebulised adrenaline",
    "PEWS paediatric early warning score",
  ],
  Toxicology: [
    "paracetamol overdose treatment line nomogram NAC",
    "opioid overdose naloxone titration dose",
    "tricyclic antidepressant overdose sodium bicarbonate",
    "beta blocker calcium channel blocker overdose",
    "serotonin syndrome diagnosis management",
  ],
  Metabolic: [
    "DKA fixed rate insulin infusion protocol",
    "hyperosmolar hyperglycaemic state HONK",
    "severe hypoglycaemia IV glucose glucagon",
    "hyperkalaemia ECG changes treatment calcium",
    "symptomatic hyponatraemia correction rate",
  ],
  Surgical: [
    "appendicitis Alvarado score CT imaging",
    "ectopic pregnancy ruptured beta-hCG",
    "acute cholecystitis Murphy sign antibiotics",
    "upper GI bleed Rockford Blatchford score",
    "AAA rupture haemodynamically unstable",
  ],
  MentalHealth: [
    "capacity assessment mental health ED",
    "self-harm risk assessment safe discharge criteria",
    "acute behavioural disturbance chemical restraint",
    "Section 136 Mental Health Act ED pathway",
  ],
  Procedures: [
    "RSI rapid sequence induction ketamine rocuronium",
    "chest drain insertion seldinger technique",
    "lumbar puncture opening pressure technique",
    "procedural sedation ketamine midazolam monitoring",
    "fascia iliaca nerve block hip fracture",
  ],
  Analgesia: [
    "multimodal analgesia opioid sparing ED",
    "renal colic NSAIDs analgesia",
    "sickle cell crisis pain management protocol",
  ],
};

const ED_GUIDELINES_SYSTEM_PROMPT = `You are an expert ED Guidelines Assistant for an Emergency Department.

## YOUR ROLE
You help clinicians quickly apply uploaded local guideline content to specific clinical scenarios.

## RESPONSE STYLE
- Lead with the immediate action for the presented scenario.
- Include only essential caveats and red flags for that scenario.
- Keep answers concise and practical.

## SOURCE CITATIONS
Always cite sources at the end. This is mandatory.
For local uploaded guidelines, use EXACTLY this line format (all fields required, including Slug):
📄 **[Document Title]** — Source: local — File: filename.pdf — Slug: the-slug-value
The Slug value comes from the "slug" field returned by ragSearch or searchGuidelines tools — always include it.
For external web guidance, use this exact line format — ONLY for URLs explicitly returned by the searchExternalWeb tool:
🔗 **[Guidance Title]** — Source: RCEM/NICE — [URL]
When reading searchExternalWeb results, use the highlights array to judge relevance first; read the text field only for results whose highlights confirm they are on-topic.
CRITICAL: Never invent, guess, or recall external URLs from training knowledge. If searchExternalWeb returned no results, was not called, or returned found:false, omit the external sources section entirely. Do not cite any URL that did not appear in the tool's response.

Close with: "This is a summary — always refer to the full guideline for complete clinical guidance."

## SEARCH STRATEGY
1. Call ragSearch first to semantically retrieve uploaded local guidelines.
2. If the "web" scope is explicitly set OR local results are clearly insufficient, call ragSearch AND searchExternalWeb in parallel (simultaneously) — do not wait for one before calling the other.
3. Use searchGuidelines only if ragSearch returns nothing useful.
4. Respect any "Search scope preference" text from the latest user message.
5. Do not answer from memory alone.`;

const searchGuidelinesTool = createTool({
  description:
    "Keyword search over uploaded local guidelines. Use as fallback after ragSearch. Returns compact metadata and bounded excerpts.",
  args: z.object({
    query: z.string().describe("Keyword query for local guideline search"),
    category: z.string().optional().describe("Optional category filter"),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const results = await ctx.runQuery(internal.guidelines.searchInternal, {
      query: args.query,
      category: args.category,
    });

    if (!results || results.length === 0) {
      return {
        found: false,
        message: "No guidelines found matching your query.",
      };
    }

    return {
      found: true,
      count: Math.min(results.length, MAX_KEYWORD_RESULTS),
      guidelines: results.slice(0, MAX_KEYWORD_RESULTS).map((g: any) => ({
        title: g.title,
        version: g.version,
        source: g.source,
        category: g.category,
        excerpt: g.content.slice(0, MAX_EXCERPT_CHARS),
        lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
        slug: g.slug,
      })),
    };
  },
});

const ragSearchTool = createTool({
  description:
    "Semantic/vector search over uploaded local guidelines. Use this first for clinical questions.",
  args: z.object({
    query: z.string().describe("Natural-language clinical query"),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const results = await rag.search(ctx, {
      namespace: "guidelines",
      query: args.query,
      limit: 6,
      filters: [],
    });

    if (!results || results.results.length === 0) {
      return {
        found: false,
        message: "No relevant document content found for this query.",
      };
    }

    const sources = await Promise.all(
      results.entries.map(async (entry) => {
        const metadata = entry.metadata as Record<string, string | undefined>;
        const guidelineId = metadata?.guidelineId ?? null;

        let slug = metadata?.slug ?? null;
        if (!slug && guidelineId) {
          try {
            const guideline = await ctx.runQuery(
              internal.guidelines.getByIdInternal,
              {
                id: guidelineId as any,
              },
            );
            slug = guideline?.slug ?? null;
          } catch {
            slug = null;
          }
        }

        return {
          title: entry.title ?? "Untitled",
          source: metadata?.source ?? "local",
          fileName: metadata?.fileName ?? "unknown",
          guidelineId,
          slug,
          textChunk: entry.text,
        };
      }),
    );

    return {
      found: true,
      count: results.entries.length,
      sources,
      combinedText: results.text,
    };
  },
});

const searchExternalWebTool = createTool({
  description:
    "Search external clinical guidance via Exa neural search constrained to NICE and/or RCEM websites. Use only when local guidance is insufficient or explicitly requested. Can be called in parallel with ragSearch.",
  args: z.object({
    query: z
      .string()
      .describe(
        "Clinical query to search, e.g. 'head injury CT criteria adults'",
      ),
    site: z
      .enum(["nice", "rcem", "both"])
      .optional()
      .describe("Restrict search to NICE, RCEM, or both sites."),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const siteKey = args.site ?? "both";
    const cacheKey = `${args.query}::${siteKey}`;

    // Check cache first (types generated by `npx convex dev`)
    const cached = await ctx.runQuery(internal.webSearchCache.getCache, {
      cacheKey,
    });
    if (cached) {
      return cached as Record<string, unknown>;
    }

    const isNiceOnly = siteKey === "nice";
    const isRcemOnly = siteKey === "rcem";

    const domains = isNiceOnly
      ? ["nice.org.uk"]
      : isRcemOnly
        ? ["rcem.ac.uk"]
        : ["nice.org.uk", "rcem.ac.uk"];

    try {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          found: false,
          source: "Exa",
          message: "EXA_API_KEY is not configured.",
        };
      }

      const exa = new Exa(apiKey);
      // highlights = key sentences (signal, ~10x fewer tokens than full text)
      // text = capped full body (reading depth when highlights flag relevance)
      const exaResult = await exa.searchAndContents(args.query, {
        includeDomains: domains,
        numResults: 5,
        type: "auto",
        highlights: {
          maxCharacters: 4000,
          query: args.query, // directs which sentences are extracted toward the clinical question
        },
        text: { maxCharacters: 10000 },
      });

      const seen = new Set<string>();
      const filteredResults = (exaResult.results ?? [])
        .filter((item) => {
          const url = item.url ?? "";
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        })
        .slice(0, 5)
        .map((item) => {
          const url = item.url ?? "";
          const exaItem = item as any;
          return {
            title: item.title ?? "Untitled",
            url,
            // highlights: key sentences for relevance signal
            highlights: Array.isArray(exaItem.highlights)
              ? (exaItem.highlights as string[]).slice(0, 3)
              : [],
            // text: fuller context to read when highlights indicate relevance
            text:
              typeof exaItem.text === "string"
                ? exaItem.text.slice(0, 800)
                : "",
            source: url.includes("nice.org.uk")
              ? "NICE"
              : url.includes("rcem.ac.uk")
                ? "RCEM"
                : "External",
          };
        });

      if (filteredResults.length === 0) {
        const result = {
          found: false,
          source: "Exa",
          siteFilter: domains.join(", "),
          message: "No external NICE/RCEM results found.",
        };
        await ctx.runMutation(internal.webSearchCache.setCache, {
          cacheKey,
          results: result,
        });
        return result;
      }

      const result = {
        found: true,
        source: "Exa",
        siteFilter: domains.join(", "),
        count: filteredResults.length,
        results: filteredResults,
      };

      // Cache the results
      await ctx.runMutation(internal.webSearchCache.setCache, {
        cacheKey,
        results: result,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        found: false,
        source: "Exa",
        siteFilter: domains.join(", "),
        message: `Exa search failed: ${message}`,
      };
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guidelineAgent: Agent<object, any> = new Agent(components.agent, {
  name: "ED Guidelines Assistant",
  languageModel: cerebras.chat("gpt-oss-120b"),
  textEmbeddingModel: process.env.OPENAI_API_KEY
    ? openai.embedding("text-embedding-3-small")
    : undefined,
  contextOptions: {
    // Cross-thread recall: limit to 4 to keep context loading fast
    searchOtherThreads: true,
    searchOptions: {
      textSearch: true,
      vectorSearch: true,
      limit: 4,
    },
  },
  instructions: ED_GUIDELINES_SYSTEM_PROMPT,
  tools: {
    searchGuidelines: searchGuidelinesTool,
    ragSearch: ragSearchTool,
    searchExternalWeb: searchExternalWebTool,
  },
  maxSteps: 4,
});

export default guidelineAgent;
