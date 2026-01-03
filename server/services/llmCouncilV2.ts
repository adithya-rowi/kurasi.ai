/**
 * LLM Council V2 - 3-Layer Architecture
 *
 * SEARCH LAYER (parallel):
 * - Perplexity (sonar) - web/news search
 * - Gemini (gemini-2.5-flash) - Google Search grounding
 * - Grok (grok-3) - X/Twitter + web live search
 *
 * ANALYSIS LAYER (parallel, receives combined search results):
 * - DeepSeek V3.2 (deepseek-chat) - deep reasoning
 * - GPT-5 mini (gpt-5-mini) - fast analysis
 *
 * JUDGE LAYER:
 * - Claude Opus 4.5 - HAKIM AKHIR
 * - Economist Espresso style brief in Bahasa Indonesia
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "../db";
import { userProfiles, dailyBriefs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// =============================================================================
// AI COUNCIL CONFIGURATION
// =============================================================================

// Phase 1.3: Safe cap applied AFTER dedupe + coverage guardrail
const MAX_CANDIDATES_FOR_ANALYSIS = 60;

const AI_COUNCIL_V2 = {
  // Search Layer
  perplexity: {
    name: "Perplexity",
    model: "sonar",
    provider: "Perplexity",
    layer: "search",
    icon: "🔴",
    color: "#1fb8cd",
    capabilities: ["web_search", "news", "real_time"],
  },
  gemini: {
    name: "Gemini 2.5 Flash",
    model: "gemini-2.5-flash",
    provider: "Google",
    layer: "search",
    icon: "🔵",
    color: "#4285f4",
    capabilities: ["google_search", "grounding", "citations"],
  },
  grok: {
    name: "Grok 3",
    model: "grok-3-latest",
    provider: "xAI",
    layer: "search",
    icon: "🟠",
    color: "#f97316",
    capabilities: ["x_twitter", "web_search", "sentiment"],
  },
  // Analysis Layer
  deepseek: {
    name: "DeepSeek V3.2",
    model: "deepseek-chat",
    provider: "DeepSeek",
    layer: "analysis",
    icon: "🟣",
    color: "#7c3aed",
    capabilities: ["deep_reasoning", "synthesis"],
  },
  openai: {
    name: "GPT-5 mini",
    model: "gpt-5-mini",
    provider: "OpenAI",
    layer: "analysis",
    icon: "🟢",
    color: "#10a37f",
    capabilities: ["fast_analysis", "structured_output"],
  },
  // Judge Layer
  claude: {
    name: "Claude Opus 4.5",
    model: "claude-opus-4-5-20251101",
    provider: "Anthropic",
    layer: "judge",
    icon: "🟤",
    color: "#d4a574",
    capabilities: ["final_judgment", "editorial", "trust_scoring"],
    isJudge: true,
  },
};

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const perplexity = process.env.PERPLEXITY_API_KEY
  ? new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    })
  : null;

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
const grokApiKey = process.env.XAI_API_KEY;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SearchArticle {
  title: string;
  summary: string;
  source: string;
  sourceType: "local" | "regional" | "global" | "social";
  url: string;
  publishedDate: string;
  confidence: number;
  isPaywalled?: boolean;
  isRealTime?: boolean;
  isSocialMedia?: boolean;
  citations?: string[];
}

interface SearchResult {
  model: string;
  provider: string;
  layer: "search";
  articles: SearchArticle[];
  searchQueries?: string[];
  citations?: string[];
  error?: string;
  latencyMs?: number;
}

interface AnalysisResult {
  model: string;
  provider: string;
  layer: "analysis";
  themes: AnalysisTheme[];
  riskAssessment?: string;
  opportunities?: string[];
  recommendations?: string[];
  error?: string;
  latencyMs?: number;
}

interface AnalysisTheme {
  topic: string;
  importance: "critical" | "important" | "background";
  summary: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  relatedArticles: number[];
}

interface UserProfile {
  id: string;
  userId: string;
  role: string; // Required: one of ALLOWED_ROLES from schema
  decisionContext: string | null; // Optional: context for decision-making
  personaSummary: string | null;
  roleDescription: string | null;
  organizationContext: string | null;
  primaryTopics: any;
  secondaryTopics: any;
  keywordsToTrack: string[] | null;
  entitiesToTrack: string[] | null;
  preferredSources: any;
  avoidTopics: string[] | null;
  languagePreference: string | null;
  councilSystemPrompt: string | null;
  successDefinition: string | null;
}

interface EspressoBrief {
  briefDate: string;
  edition: string;
  recipientName: string;
  greeting: string;
  executiveThesis?: string; // Phase 2.16: Non-neutral, time-bound thesis
  theWorldInBrief: string;
  topStories: EspressoStory[];
  tokohInsights?: EspressoStory[]; // Phase 2.19: Separate section for tracked tokoh
  marketsSnapshot?: string;
  quotaOfTheDay?: {
    quote: string;
    source: string;
  };
  agendaAhead?: string[];
  councilConsensus: string;
  confidenceScore: number;
  sourcesUsed: {
    search: string[];
    analysis: string[];
  };
}

interface EspressoStory {
  headline: string;
  body: string;
  whyItMatters: string;
  source: string;
  sourceType: "local" | "regional" | "global" | "social";
  url: string;
  verificationScore: number;
  category: "critical" | "important" | "background";
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  isBreaking?: boolean;
  isSocialTrending?: boolean;
  recencyLabel?: string; // Phase 2.19: For tokoh insights that may be older
}

// =============================================================================
// PROMPTS
// =============================================================================

// =============================================================================
// DYNAMIC SEARCH CONTEXT BUILDER
// =============================================================================

interface SearchContext {
  role: string; // Phase 0.2: passed through from profile
  decisionContext: string | null; // Phase 0.2: passed through from profile
  topics: string[];
  entities: string[];
  sources: string[];
  keywords: string[];
  avoidTopics: string[];
  language: string;
  languageName: string;
  hasIndonesianFocus: boolean;
  hasInternationalFocus: boolean;
  persona: string;
}

function buildSearchContext(profile: UserProfile): SearchContext {
  // Extract topics (handle both array and object formats)
  const primaryTopics = Array.isArray(profile.primaryTopics)
    ? profile.primaryTopics.map((t: any) => typeof t === "string" ? t : t.name || t.label || "")
    : [];
  const secondaryTopics = Array.isArray(profile.secondaryTopics)
    ? profile.secondaryTopics.map((t: any) => typeof t === "string" ? t : t.name || t.label || "")
    : [];
  const topics = [...primaryTopics, ...secondaryTopics].filter(Boolean);

  // Extract entities (institutions, companies, people to monitor)
  const entities = profile.entitiesToTrack?.filter(Boolean) || [];

  // Extract preferred sources
  const sources = Array.isArray(profile.preferredSources)
    ? profile.preferredSources.map((s: any) => typeof s === "string" ? s : s.name || s.label || "").filter(Boolean)
    : [];

  // Extract keywords
  const keywords = profile.keywordsToTrack?.filter(Boolean) || [];

  // Extract topics to avoid
  const avoidTopics = profile.avoidTopics?.filter(Boolean) || [];

  // Language preference
  const language = profile.languagePreference || "id";
  const languageName = language === "id" ? "Bahasa Indonesia" : language === "en" ? "English" : language;

  // Detect focus based on sources and entities
  const indonesianIndicators = ["indonesia", "jakarta", "rupiah", "ojk", "bi", "bumn", "kontan", "bisnis indonesia", "kompas", "tempo"];
  const allContent = [...topics, ...entities, ...sources, ...keywords].join(" ").toLowerCase();

  const hasIndonesianFocus = indonesianIndicators.some(ind => allContent.includes(ind)) || language === "id";
  const hasInternationalFocus = sources.some(s =>
    ["bloomberg", "reuters", "ft", "financial times", "wsj", "economist", "nikkei"].some(intl => s.toLowerCase().includes(intl))
  );

  // Build persona from available data
  const persona = profile.councilSystemPrompt || profile.personaSummary || profile.roleDescription || "";

  return {
    role: profile.role, // Phase 0.2: pass through exactly as provided
    decisionContext: profile.decisionContext, // Phase 0.2: pass through exactly as provided (may be null)
    topics,
    entities,
    sources,
    keywords,
    avoidTopics,
    language,
    languageName,
    hasIndonesianFocus,
    hasInternationalFocus,
    persona,
  };
}

// =============================================================================
// PHASE 1.1: EXPLICIT SEARCH QUERY GENERATION
// =============================================================================

interface SearchQueryResult {
  queries: string[];
  requirements: {
    mustCoverTokoh: string[];
    mustCoverInstitusi: string[];
    mustCoverTopics: string[];
  };
}

/**
 * Determines if an entity looks like a person (tokoh) or institution (institusi).
 * Simple heuristic: if it has spaces and doesn't match known institution patterns, treat as person.
 */
function classifyEntity(entity: string): "tokoh" | "institusi" {
  const institutionPatterns = [
    /^(BI|OJK|BEI|IDX|Kemenkeu|Bappenas|BUMN|LPS|Kemkominfo|BPK|KPK|MUI|NU|Muhammadiyah)$/i,
    /\b(bank|indonesia|kementerian|badan|otoritas|bursa|lembaga|perusahaan|pt\.|tbk|inc|corp|ltd)\b/i,
    /^[A-Z]{2,5}$/, // Acronyms like OJK, BI, etc.
  ];

  for (const pattern of institutionPatterns) {
    if (pattern.test(entity)) {
      return "institusi";
    }
  }

  // If it has spaces and looks like a name (2-4 words), treat as person
  const words = entity.trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    // Check if words look like names (capitalized)
    const looksLikeName = words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]+$/.test(w));
    if (looksLikeName) {
      return "tokoh";
    }
  }

  // Default to institusi for single words or unclear cases
  return words.length === 1 ? "institusi" : "tokoh";
}

/**
 * Phase 1.1: Generate explicit search queries from SearchContext.
 * Treats user profile as mandatory directives, not hints.
 */
function generateSearchQueries(ctx: SearchContext): SearchQueryResult {
  const queries: string[] = [];
  const mustCoverTokoh: string[] = [];
  const mustCoverInstitusi: string[] = [];
  const mustCoverTopics: string[] = [];

  // Get today's date in Indonesian format
  const now = new Date();
  const todayIndo = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const year = now.getFullYear();

  // 1. Role + DecisionContext queries (1-2 queries)
  if (ctx.role && ctx.decisionContext) {
    // Generate role-specific decision queries
    const roleQueryMap: Record<string, string[]> = {
      "Investor / Fund Manager": [
        `${ctx.decisionContext} investment outlook ${year}`,
        `${ctx.decisionContext} market analysis Indonesia hari ini`,
      ],
      "CEO / Founder": [
        `${ctx.decisionContext} business strategy ${year}`,
        `${ctx.decisionContext} startup ecosystem Indonesia hari ini`,
      ],
      "Eksekutif Korporat (CFO/COO/Head)": [
        `${ctx.decisionContext} corporate strategy ${year}`,
        `${ctx.decisionContext} regulatory update Indonesia hari ini`,
      ],
      "Komisaris / Penasihat Senior": [
        `${ctx.decisionContext} governance insights ${year}`,
        `${ctx.decisionContext} board advisory Indonesia hari ini`,
      ],
      "Konsultan / Advisor": [
        `${ctx.decisionContext} consulting trends ${year}`,
        `${ctx.decisionContext} advisory market Indonesia hari ini`,
      ],
      "Regulator / Pemerintahan": [
        `${ctx.decisionContext} policy update ${year}`,
        `${ctx.decisionContext} regulation Indonesia hari ini`,
      ],
      "Akademisi / Peneliti": [
        `${ctx.decisionContext} research insights ${year}`,
        `${ctx.decisionContext} academic perspective Indonesia hari ini`,
      ],
    };

    const roleQueries = roleQueryMap[ctx.role] || [
      `${ctx.decisionContext} latest news ${year}`,
      `${ctx.decisionContext} Indonesia hari ini`,
    ];
    queries.push(...roleQueries.slice(0, 2));
  } else if (ctx.role) {
    // Only role, no decisionContext - generate 1 generic role query
    const genericRoleQueries: Record<string, string> = {
      "Investor / Fund Manager": `investment trends Indonesia ${year} hari ini`,
      "CEO / Founder": `startup business news Indonesia ${year} hari ini`,
      "Eksekutif Korporat (CFO/COO/Head)": `corporate news Indonesia ${year} hari ini`,
      "Komisaris / Penasihat Senior": `governance news Indonesia ${year} hari ini`,
      "Konsultan / Advisor": `consulting market Indonesia ${year} hari ini`,
      "Regulator / Pemerintahan": `regulatory news Indonesia ${year} hari ini`,
      "Akademisi / Peneliti": `research news Indonesia ${year} hari ini`,
    };
    queries.push(genericRoleQueries[ctx.role] || `business news Indonesia ${year} hari ini`);
  }

  // 2. Entity queries (tokoh and institusi)
  for (const entity of ctx.entities) {
    const entityType = classifyEntity(entity);

    if (entityType === "tokoh") {
      mustCoverTokoh.push(entity);
      // Add tokoh-specific queries
      queries.push(`${entity} latest interview OR podcast OR talk ${year}`);
      queries.push(`${entity} thoughts venture capital ${year}`);
      queries.push(`${entity} X Twitter recent insights`);
    } else {
      mustCoverInstitusi.push(entity);
      // Add institusi-specific queries
      queries.push(`${entity} press release hari ini ${todayIndo}`);
      queries.push(`${entity} regulation update hari ini`);
    }
  }

  // 3. Topic queries
  for (const topic of ctx.topics) {
    mustCoverTopics.push(topic);
    queries.push(`${topic} Indonesia berita hari ini ${todayIndo}`);
    queries.push(`${topic} global latest today ${year}`);
  }

  // 4. Truncate intelligently to 8-12 queries
  // Priority: role queries > tokoh queries > institusi queries > topic queries
  let finalQueries = queries;
  if (finalQueries.length > 12) {
    // Keep first 2 (role), then balance tokoh/institusi/topics
    const roleQueries = finalQueries.slice(0, 2);
    const remaining = finalQueries.slice(2);

    // Take proportionally from remaining, up to 10 more
    finalQueries = [...roleQueries, ...remaining.slice(0, 10)];
  }

  // Ensure minimum of 8 queries by adding generic ones if needed
  while (finalQueries.length < 8) {
    if (ctx.hasIndonesianFocus) {
      finalQueries.push(`berita ekonomi bisnis Indonesia hari ini ${todayIndo}`);
    } else {
      finalQueries.push(`global business news today ${year}`);
    }
    // Avoid infinite loop
    if (finalQueries.length >= 8) break;
    finalQueries.push(`market trends ${ctx.languageName === "Bahasa Indonesia" ? "Indonesia" : "global"} ${year}`);
  }

  // Final trim to max 12
  finalQueries = finalQueries.slice(0, 12);

  return {
    queries: finalQueries,
    requirements: {
      mustCoverTokoh,
      mustCoverInstitusi,
      mustCoverTopics,
    },
  };
}

// =============================================================================
// PHASE 1.2: DEDUPE + COVERAGE GUARDRAIL
// =============================================================================

/**
 * Normalizes a URL for deduplication:
 * - Lowercase
 * - Strip tracking params (utm_*, fbclid, gclid, ref, etc.)
 * - Strip trailing slashes
 */
function normalizeUrl(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url.toLowerCase());

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source", "ref_src", "ref_url",
      "campaign", "affiliate", "partner", "click_id", "tracking_id",
    ];

    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // Rebuild URL without trailing slash
    let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    if (parsed.search) {
      normalized += parsed.search;
    }

    return normalized.replace(/\/$/, ""); // Strip trailing slash
  } catch {
    // If URL parsing fails, just lowercase and trim
    return url.toLowerCase().trim();
  }
}

/**
 * Normalizes a title for deduplication:
 * - Lowercase
 * - Trim
 * - Collapse multiple whitespace to single space
 */
function normalizeTitle(title: string): string {
  if (!title) return "";
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Deduplicates search articles across all search results.
 * - Prefers deduplication by canonical URL
 * - Falls back to normalized title if URL is missing
 * - Keeps first occurrence, drops duplicates
 */
function dedupeSearchResults(searchResults: SearchResult[]): SearchResult[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  return searchResults.map(result => {
    const dedupedArticles = result.articles.filter(article => {
      // Try URL-based dedupe first
      if (article.url) {
        const normalizedUrl = normalizeUrl(article.url);
        if (seenUrls.has(normalizedUrl)) {
          return false; // Duplicate by URL
        }
        seenUrls.add(normalizedUrl);
      }

      // Fallback to title-based dedupe
      if (article.title) {
        const normalizedTitle = normalizeTitle(article.title);
        if (seenTitles.has(normalizedTitle)) {
          return false; // Duplicate by title
        }
        seenTitles.add(normalizedTitle);
      }

      return true; // Keep this article
    });

    return {
      ...result,
      articles: dedupedArticles,
    };
  });
}

/**
 * Checks if a text contains a mention of the given entity (case-insensitive).
 */
function textContainsEntity(text: string, entity: string): boolean {
  if (!text || !entity) return false;
  return text.toLowerCase().includes(entity.toLowerCase());
}

/**
 * Computes coverage of required entities in search results.
 * Returns lists of covered and missing tokoh/institusi.
 */
interface CoverageResult {
  tokohCovered: string[];
  tokohMissing: string[];
  institusiCovered: string[];
  institusiMissing: string[];
  topicsCovered: string[];
  topicsMissing: string[];
  warnings: string[];
}

function computeCoverage(
  searchResults: SearchResult[],
  requirements: SearchQueryResult["requirements"]
): CoverageResult {
  // Collect all searchable text from articles
  const allText = searchResults
    .flatMap(r => r.articles)
    .map(a => `${a.title} ${a.summary} ${a.url} ${a.source}`)
    .join(" ");

  const tokohCovered: string[] = [];
  const tokohMissing: string[] = [];
  const institusiCovered: string[] = [];
  const institusiMissing: string[] = [];
  const topicsCovered: string[] = [];
  const topicsMissing: string[] = [];
  const warnings: string[] = [];

  // Check tokoh coverage
  for (const tokoh of requirements.mustCoverTokoh) {
    if (textContainsEntity(allText, tokoh)) {
      tokohCovered.push(tokoh);
    } else {
      tokohMissing.push(tokoh);
      warnings.push(`Tidak ditemukan berita relevan untuk tokoh: ${tokoh} (7 hari terakhir)`);
    }
  }

  // Check institusi coverage
  for (const institusi of requirements.mustCoverInstitusi) {
    if (textContainsEntity(allText, institusi)) {
      institusiCovered.push(institusi);
    } else {
      institusiMissing.push(institusi);
      warnings.push(`Tidak ditemukan update untuk institusi: ${institusi} (24 jam terakhir)`);
    }
  }

  // Check topic coverage
  for (const topic of requirements.mustCoverTopics) {
    if (textContainsEntity(allText, topic)) {
      topicsCovered.push(topic);
    } else {
      topicsMissing.push(topic);
      warnings.push(`Tidak ditemukan berita untuk topik: ${topic} (48 jam terakhir)`);
    }
  }

  return {
    tokohCovered,
    tokohMissing,
    institusiCovered,
    institusiMissing,
    topicsCovered,
    topicsMissing,
    warnings,
  };
}

/**
 * Creates a synthetic SearchResult entry containing coverage warnings.
 * This allows downstream layers (analysis, judge) to see what's missing.
 */
function createCoverageWarningResult(coverage: CoverageResult): SearchResult | null {
  if (coverage.warnings.length === 0) {
    return null;
  }

  return {
    model: "CoverageGuardrail",
    provider: "System",
    layer: "search",
    articles: coverage.warnings.map((warning, i) => ({
      title: `⚠️ Coverage Warning ${i + 1}`,
      summary: warning,
      source: "System Coverage Check",
      sourceType: "local" as const,
      url: "",
      publishedDate: new Date().toISOString().split("T")[0],
      confidence: 10,
      isRealTime: false,
    })),
  };
}

// =============================================================================
// Phase 2.2: WhyItMatters Validator
// =============================================================================

export type WhyItMattersViolation = {
  index: number;
  reasons: string[];
  original: string;
};

/**
 * Validates whyItMatters fields against the PERSONALIZATION CONTRACT.
 * Returns violations if any rules are broken.
 */
export function validateWhyItMatters(
  role: string,
  decisionContext: string | null,
  items: { whyItMatters?: string; headline?: string }[]
): WhyItMattersViolation[] {
  const violations: WhyItMattersViolation[] = [];
  const expectedPrefix = `Sebagai ${role},`;

  items.forEach((item, index) => {
    const reasons: string[] = [];
    const whyItMatters = item.whyItMatters || "";

    // Rule 1: whyItMatters must exist and be non-empty
    if (!whyItMatters || whyItMatters.trim().length === 0) {
      reasons.push("missing_why");
    } else {
      // Rule 2: must start with "Sebagai ${role},"
      const trimmed = whyItMatters.trim();
      if (!trimmed.startsWith(expectedPrefix)) {
        reasons.push("missing_prefix");
      }

      // Rule 3: if decisionContext is non-null and not empty, must include it
      if (decisionContext && decisionContext.trim().length > 0) {
        if (!trimmed.toLowerCase().includes(decisionContext.toLowerCase())) {
          reasons.push("missing_decision_context");
        }
      }

      // Rule 4: generic phrase ban (unless role is Eksekutif Korporat)
      if (role !== "Eksekutif Korporat (CFO/COO/Head)") {
        if (trimmed.toLowerCase().includes("bagi eksekutif")) {
          reasons.push("uses_generic_exec_phrase");
        }
      }
    }

    if (reasons.length > 0) {
      violations.push({
        index,
        reasons,
        original: whyItMatters,
      });
    }
  });

  return violations;
}

// =============================================================================
// Phase 2.3: JSON Recovery Helper (exported for testing)
// =============================================================================

export type JsonExtractionResult =
  | { success: true; json: string }
  | { success: false; error: string };

/**
 * Attempts to extract valid JSON from a string that may have non-JSON prefix/suffix.
 * Used by Perplexity parser to recover from conversational responses.
 */
export function extractJsonFromResponse(rawContent: string): JsonExtractionResult {
  const trimmed = rawContent.replace(/```json\n?|\n?```/g, "").trim();

  // Fast path: try direct parse if it looks like JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return { success: true, json: trimmed };
    } catch {
      // Fall through to extraction
    }
  }

  // Slow path: try to extract JSON substring
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, error: "Non-JSON response" };
  }

  const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    JSON.parse(jsonCandidate); // Validate
    return { success: true, json: jsonCandidate };
  } catch {
    return { success: false, error: "Non-JSON response" };
  }
}

// =============================================================================
// Phase 2.7: Bracket-depth article array extraction
// =============================================================================

/**
 * Extracts the articles array from a JSON string using bracket depth counting.
 * More reliable than regex when the full JSON is malformed.
 */
export function extractArticlesArrayByDepth(text: string): string | null {
  // Find "articles" key
  const articlesKeyIndex = text.indexOf('"articles"');
  if (articlesKeyIndex === -1) return null;

  // Find the opening bracket after "articles":
  const colonIndex = text.indexOf(':', articlesKeyIndex);
  if (colonIndex === -1) return null;

  let bracketStart = -1;
  for (let i = colonIndex + 1; i < text.length; i++) {
    if (text[i] === '[') {
      bracketStart = i;
      break;
    } else if (text[i] !== ' ' && text[i] !== '\n' && text[i] !== '\r' && text[i] !== '\t') {
      // Non-whitespace before bracket means malformed
      return null;
    }
  }

  if (bracketStart === -1) return null;

  // Count bracket depth to find matching ]
  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let i = bracketStart + 1; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '[') depth++;
      if (char === ']') depth--;
      if (depth === 0) {
        return text.substring(bracketStart, i + 1);
      }
    }
  }

  return null; // No matching bracket found
}

/**
 * Salvages article objects from text using forgiving regex.
 * Last resort when JSON parsing and bracket extraction fail.
 */
export function salvageArticlesWithRegex(text: string): any[] {
  const articles: any[] = [];

  // Match objects that look like articles (have title and summary)
  const objectPattern = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"summary"\s*:\s*"[^"]*"[^{}]*\}/g;
  const matches = text.match(objectPattern) || [];

  for (const match of matches) {
    try {
      // Fix common issues before parsing
      let fixed = match
        .replace(/,\s*}/g, '}')  // trailing comma
        .replace(/'/g, '"');     // single quotes to double

      const obj = JSON.parse(fixed);
      if (obj.title && obj.summary) {
        articles.push(obj);
      }
    } catch {
      // Try extracting fields manually
      const titleMatch = match.match(/"title"\s*:\s*"([^"]*)"/);
      const summaryMatch = match.match(/"summary"\s*:\s*"([^"]*)"/);
      const sourceMatch = match.match(/"source"\s*:\s*"([^"]*)"/);
      const urlMatch = match.match(/"url"\s*:\s*"([^"]*)"/);

      if (titleMatch && summaryMatch) {
        articles.push({
          title: titleMatch[1],
          summary: summaryMatch[1],
          source: sourceMatch?.[1] || "",
          url: urlMatch?.[1] || "",
        });
      }
    }
  }

  return articles;
}

function buildSearchPrompt(ctx: SearchContext): string {
  const sections: string[] = [];

  // Phase 1.1: Generate explicit search queries
  const queryResult = generateSearchQueries(ctx);

  // MANDATORY QUERIES section - treat as directives, not hints
  sections.push(`═══════════════════════════════════════════════════════════════
MANDATORY QUERIES - Execute these searches in order:
═══════════════════════════════════════════════════════════════

${queryResult.queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

═══════════════════════════════════════════════════════════════`);

  // Phase 1.2: Recency by type + Coverage requirements
  const coverageRules: string[] = [];

  // RECENCY RULES BY TYPE
  sections.push(`═══════════════════════════════════════════════════════════════
RECENCY RULES BY TYPE:
═══════════════════════════════════════════════════════════════
• INSTITUSI queries (${queryResult.requirements.mustCoverInstitusi.join(", ") || "none"}): LAST 24 HOURS only
• TOPIC queries (${queryResult.requirements.mustCoverTopics.join(", ") || "none"}): LAST 48 HOURS
• TOKOH queries (${queryResult.requirements.mustCoverTokoh.join(", ") || "none"}): LAST 7 DAYS (prefer last 48h if available)
═══════════════════════════════════════════════════════════════`);

  if (queryResult.requirements.mustCoverTokoh.length > 0) {
    coverageRules.push(`TOKOH COVERAGE REQUIRED: At least 2 results must mention each of: ${queryResult.requirements.mustCoverTokoh.join(", ")}`);
    coverageRules.push(`Tokoh recency: search up to 7 days back. If no recent news found, explicitly state: "Tidak ditemukan berita terkini tentang [nama tokoh] (7 hari terakhir)."`);
  }
  if (queryResult.requirements.mustCoverInstitusi.length > 0) {
    coverageRules.push(`INSTITUSI COVERAGE REQUIRED: At least 1 result must mention each of: ${queryResult.requirements.mustCoverInstitusi.join(", ")}`);
    coverageRules.push(`Institusi recency: LAST 24 HOURS only. If no update found, state: "Tidak ditemukan update untuk [institusi] (24 jam terakhir)."`);
  }
  if (queryResult.requirements.mustCoverTopics.length > 0) {
    coverageRules.push(`TOPIC COVERAGE REQUIRED: At least 1 result must cover each of: ${queryResult.requirements.mustCoverTopics.join(", ")}`);
    coverageRules.push(`Topic recency: LAST 48 HOURS.`);
  }

  if (coverageRules.length > 0) {
    sections.push(`COVERAGE REQUIREMENTS:\n${coverageRules.join("\n")}`);
  }

  // Add source guidance only if sources are specified
  if (ctx.sources.length > 0) {
    sections.push(`PREFERRED SOURCES: ${ctx.sources.join(", ")}`);
  }

  // Add topics to avoid
  if (ctx.avoidTopics.length > 0) {
    sections.push(`AVOID TOPICS: ${ctx.avoidTopics.join(", ")}`);
  }

  // Add persona context if available
  if (ctx.persona) {
    sections.push(`USER CONTEXT: ${ctx.persona}`);
  }

  // Add language preference
  sections.push(`OUTPUT LANGUAGE: ${ctx.languageName}`);

  return sections.join("\n\n");
}

function buildAnalysisPrompt(ctx: SearchContext): string {
  return `You are a senior analyst synthesizing news for executives.

TASKS:
1. Identify main themes and patterns from the news collection
2. Categorize by urgency: critical (action needed today), important (this week), background (monitor)
3. Analyze sentiment and business implications
4. Identify hidden risks and opportunities

${ctx.persona ? `USER CONTEXT: ${ctx.persona}` : ""}

OUTPUT: Structured analysis in ${ctx.languageName}`;
}

const ECONOMIST_ESPRESSO_PROMPT = `Anda adalah HAKIM AKHIR Dewan AI Loper.

GAYA PENULISAN: The Economist Espresso
- Tajam, witty, informatif
- Setiap kata bermakna
- Insight yang actionable
- Tone profesional namun engaging

STRUKTUR BRIEF:
1. THE WORLD IN BRIEF: 2-3 kalimat overview hari ini
2. TOP STORIES: 3-5 berita terpenting dengan:
   - Headline yang menarik
   - Body 2-3 kalimat
   - "Why it matters" untuk user ini
3. MARKETS SNAPSHOT (jika relevan)
4. QUOTE OF THE DAY (opsional, jika ada yang menarik)
5. AGENDA AHEAD: Apa yang perlu dipantau

BAHASA: Bahasa Indonesia yang profesional dan elegan
VERIFIKASI: Berikan verification score (1-10) untuk setiap berita`;

// =============================================================================
// SEARCH LAYER IMPLEMENTATIONS
// =============================================================================

async function searchWithPerplexity(profile: UserProfile): Promise<SearchResult> {
  if (!perplexity) {
    return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "Not configured" };
  }

  const startTime = Date.now();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const todayIndo = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const ctx = buildSearchContext(profile);

  // Phase 1.1: Get mandatory queries for enforcement
  const queryResult = generateSearchQueries(ctx);

  // Phase 2.10.1: Simplified prompt - articles only, no searchQueries
  const searchPrompt = `RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS. NO APOLOGIES. NO TEXT BEFORE OR AFTER THE JSON.

You are a news search assistant. Search for TODAY'S news only.

${buildSearchPrompt(ctx)}

TANGGAL HARI INI: ${todayIndo} (${today})

CRITICAL INSTRUCTIONS:
1. Execute the MANDATORY QUERIES listed above IN ORDER
2. Only include news from the LAST 24 HOURS
3. For each query, find at least 1 relevant article
4. DO NOT output searchQueries. Return ONLY the articles array.

Search for 7-10 LATEST news articles published TODAY. Return ONLY this JSON structure:
{"articles":[{"title":"Article title","summary":"2-3 sentence summary in ${ctx.languageName}","source":"Source name","url":"Full URL","publishedDate":"${today}","confidence":8}]}

RULES:
- PRIORITIZE articles from the last 24 hours (today's date: ${todayIndo})
- EXCLUDE any news older than 48 hours unless highly relevant breaking news
- Include valid URLs for each article
- Confidence: 9-10 official sources, 7-8 trusted media, 5-6 general media
- MUST cover tokoh/institusi/topics from COVERAGE REQUIREMENTS above

YOUR ENTIRE RESPONSE MUST BE VALID JSON STARTING WITH { AND ENDING WITH }`;

  // Phase 2.10: Retry with jitter (max 2 attempts)
  const maxAttempts = 2;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔴 Perplexity searching web/news... (attempt ${attempt}/${maxAttempts})`);
      const response = await perplexity.chat.completions.create({
        model: "sonar",
        messages: [
          { role: "system", content: "Search the web for latest Indonesian business news. Return valid JSON with real URLs." },
          { role: "user", content: searchPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096, // Phase 2.10.1: Doubled to reduce truncation
      });

      const rawContent = response.choices[0].message.content || "";

      // Phase 2.10: Log raw content BEFORE any parsing
      console.log(`🔴 Perplexity raw (${rawContent.length} chars):`, rawContent.substring(0, 300));

      // Phase 2.10: Clean content BEFORE JSON extraction
      // Strip citation tokens including ranges like [cite: 2-13] or [cite: 1, 3, 5]
      const cleanedContent = rawContent
        .replace(/```json\n?|\n?```/g, "")
        .replace(/\[cite:\s*[\d\-,\s]+\]/g, "");

      // Check for refusal patterns before parsing
      const refusalPatterns = [
        /I appreciate your/i,
        /I'm unable to/i,
        /I cannot perform/i,
        /I apologize/i,
        /cannot search/i,
      ];
      const isRefusal = refusalPatterns.some(p => p.test(cleanedContent));
      if (isRefusal && !cleanedContent.includes('"articles"')) {
        console.log(`❌ Perplexity attempt ${attempt}: Refusal response detected`);
        lastError = "Refusal response";
        if (attempt < maxAttempts) {
          const jitter = 300 + Math.random() * 200; // 300-500ms
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
        return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "Refusal response" };
      }

      // Phase 2.3: Use helper for JSON extraction with recovery
      const extraction = extractJsonFromResponse(cleanedContent);
      if (!extraction.success) {
        console.log(`❌ Perplexity attempt ${attempt}: Non-JSON response`);
        lastError = "Non-JSON response";
        if (attempt < maxAttempts) {
          const jitter = 300 + Math.random() * 200;
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
        return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "Non-JSON response" };
      }

      const parsed = JSON.parse(extraction.json);

      // Phase 2.10.1: Detect contract violation - searchQueries but no articles
      if (parsed.searchQueries && (!parsed.articles || !Array.isArray(parsed.articles))) {
        console.log(`❌ Perplexity attempt ${attempt}: Contract violation - returned searchQueries but no articles`);
        lastError = "Contract violation";
        if (attempt < maxAttempts) {
          const jitter = 300 + Math.random() * 200;
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
        return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "Contract violation" };
      }

      // Extract citations from Perplexity response
      const citations = (response as any).citations || [];

      const articles: SearchArticle[] = (parsed.articles || []).map((a: any) => ({
        title: a.title || "",
        summary: a.summary || "",
        source: a.source || "",
        sourceType: a.sourceType || "local",
        url: a.url || "",
        publishedDate: a.publishedDate || today,
        confidence: a.confidence || 7,
        isPaywalled: a.isPaywalled || false,
        isRealTime: true,
        citations,
      }));

      // Phase 2.10: Check for empty articles
      if (articles.length === 0) {
        console.log(`❌ Perplexity attempt ${attempt}: Empty articles`);
        lastError = "Empty articles";
        if (attempt < maxAttempts) {
          const jitter = 300 + Math.random() * 200;
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
        return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "Empty articles" };
      }

      console.log(`✅ Perplexity returned ${articles.length} articles on attempt ${attempt}`);
      return {
        model: "Perplexity",
        provider: "Perplexity",
        layer: "search",
        articles,
        searchQueries: parsed.searchQueries,
        citations,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error(`❌ Perplexity attempt ${attempt} error:`, error.message);
      lastError = "API error";
      if (attempt < maxAttempts) {
        const jitter = 300 + Math.random() * 200;
        await new Promise(r => setTimeout(r, jitter));
        continue;
      }
      return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: "API error" };
    }
  }

  // Should not reach here, but fallback
  return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: lastError || "Unknown error" }
}

async function searchWithGemini(profile: UserProfile): Promise<SearchResult> {
  if (!geminiApiKey) {
    return { model: "Gemini", provider: "Google", layer: "search", articles: [], error: "Not configured" };
  }

  const startTime = Date.now();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const todayIndo = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const ctx = buildSearchContext(profile);

  // Phase 1.1: Get mandatory queries for enforcement
  const queryResult = generateSearchQueries(ctx);

  // Phase 2.8: Removed url from JSON to prevent truncation - urls come from grounding metadata
  const searchPrompt = `RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS. NO TEXT BEFORE OR AFTER THE JSON.

You are a news search assistant. Search for TODAY'S news only.

${buildSearchPrompt(ctx)}

TANGGAL HARI INI: ${todayIndo} (${today})

CRITICAL INSTRUCTIONS:
1. Execute the MANDATORY QUERIES listed above using Google Search
2. ONLY include articles from the LAST 24 HOURS
3. EXCLUDE any news older than 48 hours
4. Ensure coverage of tokoh/institusi/topics as specified
5. If a tokoh has no recent news, note in summary: "Tidak ditemukan berita terkini"
6. DO NOT include any URLs in the JSON - URLs will be added from search metadata

Search for 7-10 LATEST news articles published TODAY. Your response must be ONLY this JSON structure:
{"articles":[{"title":"Article title","summary":"2-3 sentence summary in ${ctx.languageName}","source":"Source name","sourceType":"local|regional|global","publishedDate":"${today}","confidence":8,"matchedQuery":"which mandatory query this answers"}]}

YOUR ENTIRE RESPONSE MUST BE VALID JSON STARTING WITH { AND ENDING WITH }`;

  try {
    console.log("🔵 Gemini searching with Google grounding...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: searchPrompt }],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192, // Phase 2.8: Doubled to reduce truncation
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const candidate = data.candidates?.[0];
    let textContent = candidate?.content?.parts?.map((p: any) => p.text).join("") || "{}";
    const groundingMetadata = candidate?.groundingMetadata;

    // Extract grounding sources
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks.map((c: any) => c.web?.uri).filter(Boolean);

    // Robust JSON parsing: remove markdown and citation tokens first
    textContent = textContent
      .replace(/```json\n?|\n?```/g, "")
      .replace(/\[cite:\s*\d+\]/g, "") // Remove [cite: 1] tokens
      .trim();

    // Extract JSON from response - handle prefix/suffix garbage
    const jsonStart = textContent.indexOf('{');
    const jsonEnd = textContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      textContent = textContent.substring(jsonStart, jsonEnd + 1);
    }

    // Remove control characters and fix newlines
    textContent = textContent
      .replace(/[\r\n]+/g, " ")
      .replace(/[\x00-\x1F\x7F]/g, " ");

    // Fix trailing commas before } or ] (common JSON issue)
    textContent = textContent.replace(/,\s*([}\]])/g, '$1');

    let parsed;
    let parseError: string | null = null;

    try {
      parsed = JSON.parse(textContent);
    } catch (err: any) {
      // Phase 2.7: Enhanced fallback with bracket-depth extraction
      console.log("⚠️ Gemini JSON parse failed, trying bracket-depth extraction...");
      console.error("   Parse error:", err.message);
      console.error("   📝 Response (first 200):", textContent.substring(0, 200));
      console.error("   📝 Response (last 200):", textContent.substring(Math.max(0, textContent.length - 200)));

      // Fallback 1: Extract articles array using bracket depth counting
      const articlesArrayStr = extractArticlesArrayByDepth(textContent);
      if (articlesArrayStr) {
        try {
          const articlesArray = JSON.parse(articlesArrayStr);
          if (Array.isArray(articlesArray) && articlesArray.length > 0) {
            console.log(`✅ Bracket-depth extraction succeeded: ${articlesArray.length} articles`);
            parsed = { articles: articlesArray };
          }
        } catch {
          console.log("   Bracket-depth array parse failed, trying chunk splitting...");
        }
      }

      // Fallback 2: Split by },{ and parse individual chunks
      if (!parsed) {
        const articlesMatch = textContent.match(/"articles"\s*:\s*\[/);
        if (articlesMatch && articlesArrayStr) {
          const articles: any[] = [];
          // Remove outer brackets and split
          const innerContent = articlesArrayStr.slice(1, -1);
          const articleChunks = innerContent.split(/}\s*,\s*{/);

          for (let i = 0; i < articleChunks.length; i++) {
            try {
              let chunk = articleChunks[i].trim();
              if (!chunk.startsWith('{')) chunk = '{' + chunk;
              if (!chunk.endsWith('}')) chunk = chunk + '}';
              chunk = chunk.replace(/,\s*([}\]])/g, '$1');

              const art = JSON.parse(chunk);
              if (art.title && art.summary) {
                articles.push(art);
              }
            } catch {
              // Skip malformed chunk
            }
          }

          if (articles.length > 0) {
            console.log(`✅ Chunk splitting salvaged ${articles.length} articles`);
            parsed = { articles };
          }
        }
      }

      // Fallback 3: Regex salvage as last resort
      if (!parsed) {
        console.log("   Trying regex salvage as last resort...");
        const salvaged = salvageArticlesWithRegex(textContent);
        if (salvaged.length > 0) {
          console.log(`✅ Regex salvage recovered ${salvaged.length} articles`);
          parsed = { articles: salvaged };
        } else {
          console.error("❌ All salvage attempts failed");
          parsed = { articles: [] };
          parseError = "JSON parse failed";
        }
      }
    }

    // Phase 2.8: Map citations to article URLs (url removed from JSON to prevent truncation)
    const articles: SearchArticle[] = (parsed.articles || []).map((a: any, i: number) => ({
      title: a.title || "",
      summary: a.summary || "",
      source: a.source || "",
      sourceType: a.sourceType || "local",
      url: a.url || citations[i] || "", // Prefer parsed url, fallback to citation by index
      publishedDate: a.publishedDate || today,
      confidence: a.confidence || 7,
      isRealTime: true,
      citations,
    }));

    const result: SearchResult = {
      model: "Gemini",
      provider: "Google",
      layer: "search",
      articles,
      searchQueries: groundingMetadata?.webSearchQueries,
      citations,
      latencyMs: Date.now() - startTime,
    };

    // Phase 2.7: Include error when parsing failed completely
    if (parseError && articles.length === 0) {
      result.error = parseError;
    }

    return result;
  } catch (error: any) {
    console.error("❌ Gemini error:", error.message);
    return { model: "Gemini", provider: "Google", layer: "search", articles: [], error: error.message };
  }
}

async function searchWithGrok(profile: UserProfile): Promise<SearchResult> {
  if (!grokApiKey) {
    return { model: "Grok", provider: "xAI", layer: "search", articles: [], error: "Not configured" };
  }

  const startTime = Date.now();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const todayIndo = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const ctx = buildSearchContext(profile);

  // Phase 1.1: Get mandatory queries for enforcement
  const queryResult = generateSearchQueries(ctx);

  const searchPrompt = `Search X/Twitter and web for TODAY'S discussions and news (${todayIndo}).

${buildSearchPrompt(ctx)}

RECENCY: LAST 24 HOURS ONLY (since ${yesterday})
- Only include tweets and news from TODAY
- Exclude anything older than 24 hours

CRITICAL INSTRUCTIONS:
1. Execute the MANDATORY QUERIES listed above on X/Twitter and web
2. Prioritize finding tokoh mentions and social media discussions
3. For each tokoh, find their recent tweets, mentions, or discussions
4. If a tokoh has no X/Twitter presence today, note: "Tidak ditemukan aktivitas X/Twitter terkini"

FOCUS:
- Tweets from the specified tokoh/people in queries
- Tweets mentioning specified institutions
- Public sentiment and market reactions
- Breaking news and trending discussions about specified topics

Return JSON in ${ctx.languageName}:
{
  "articles": [{
    "title": "Topic/Headline",
    "summary": "Discussion/news summary",
    "source": "Source name or @username",
    "sourceType": "social|local|global",
    "url": "Tweet or article URL",
    "publishedDate": "${today}",
    "confidence": 7,
    "isSocialMedia": true,
    "sentiment": "positive|negative|neutral|mixed",
    "matchedQuery": "which mandatory query this answers"
  }],
  "trendingTopics": ["#hashtag1", "#hashtag2"],
  "overallSentiment": "neutral",
  "tokohActivity": {
    "found": ["tokoh with recent activity"],
    "notFound": ["tokoh with no recent activity"]
  }
}`;

  try {
    console.log("🟠 Grok searching X/Twitter + web...");
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-latest",
        messages: [
          { role: "system", content: "You have access to X/Twitter and web. Search for latest discussions and news. Return valid JSON." },
          { role: "user", content: searchPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        search_parameters: {
          mode: "on",
          sources: [{ type: "web" }, { type: "x" }],
          max_search_results: 20,
          from_date: yesterday, // Last 24 hours only
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const content = data.choices?.[0]?.message?.content || "{}";
    const citations = data.citations || [];

    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());

    const articles: SearchArticle[] = (parsed.articles || []).map((a: any) => ({
      title: a.title || "",
      summary: a.summary || "",
      source: a.source || "",
      sourceType: a.sourceType || "social",
      url: a.url || "",
      publishedDate: a.publishedDate || today,
      confidence: a.confidence || 6,
      isRealTime: true,
      isSocialMedia: a.isSocialMedia || a.sourceType === "social",
      citations,
    }));

    return {
      model: "Grok",
      provider: "xAI",
      layer: "search",
      articles,
      citations,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("❌ Grok error:", error.message);
    return { model: "Grok", provider: "xAI", layer: "search", articles: [], error: error.message };
  }
}

// =============================================================================
// ANALYSIS LAYER IMPLEMENTATIONS
// =============================================================================

async function analyzeWithDeepSeek(
  profile: UserProfile,
  searchResults: SearchResult[],
  ctx: SearchContext // Phase 0.3: receive SearchContext with role and decisionContext
): Promise<AnalysisResult> {
  if (!deepseek) {
    return { model: "DeepSeek", provider: "DeepSeek", layer: "analysis", themes: [], error: "Not configured" };
  }

  const startTime = Date.now();
  // Phase 0.3: ctx is now passed in (contains role and decisionContext)
  const allArticles = searchResults.flatMap((r, idx) =>
    r.articles.map((a, i) => ({ ...a, resultIndex: idx, articleIndex: i }))
  );

  const analysisPrompt = `${buildAnalysisPrompt(ctx)}

USER PROFILE:
${profile.councilSystemPrompt || profile.personaSummary || "Executive professional"}

SUCCESS CRITERIA:
"${profile.successDefinition || "Receive actionable intelligence"}"

NEWS DATA (${allArticles.length} articles from ${searchResults.length} sources):
${JSON.stringify(allArticles, null, 2)}

TASKS:
1. Identify 3-5 main themes
2. Categorize urgency: critical/important/background
3. Analyze sentiment and implications
4. Identify hidden risks
5. Recommend actions

Return JSON in ${ctx.languageName}:
{
  "themes": [{
    "topic": "Theme name",
    "importance": "critical|important|background",
    "summary": "2-3 sentence analysis",
    "sentiment": "positive|negative|neutral|mixed",
    "confidence": 8,
    "relatedArticles": [0, 2, 5]
  }],
  "riskAssessment": "Overall risk assessment",
  "opportunities": ["Opportunity 1", "Opportunity 2"],
  "recommendations": ["Action 1", "Action 2"]
}`;

  try {
    console.log("🟣 DeepSeek analyzing with deep reasoning...");
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: `You are a senior analyst. Provide deep analysis in ${ctx.languageName}. Return valid JSON.` },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());

    return {
      model: "DeepSeek",
      provider: "DeepSeek",
      layer: "analysis",
      themes: parsed.themes || [],
      riskAssessment: parsed.riskAssessment,
      opportunities: parsed.opportunities,
      recommendations: parsed.recommendations,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("❌ DeepSeek error:", error.message);
    return { model: "DeepSeek", provider: "DeepSeek", layer: "analysis", themes: [], error: error.message };
  }
}

async function analyzeWithGPT(
  profile: UserProfile,
  searchResults: SearchResult[],
  ctx: SearchContext // Phase 0.3: receive SearchContext with role and decisionContext
): Promise<AnalysisResult> {
  if (!openai) {
    return { model: "GPT-5 mini", provider: "OpenAI", layer: "analysis", themes: [], error: "Not configured" };
  }

  const startTime = Date.now();
  // Phase 0.3: ctx is now passed in (contains role and decisionContext)
  const allArticles = searchResults.flatMap((r) => r.articles);

  // Prepare simplified article data for analysis
  // Phase 1.3: Removed premature .slice(0, 15) - cap is now applied in orchestrator after dedupe
  const simplifiedArticles = allArticles.map((a, i) => ({
    index: i,
    title: a.title,
    summary: a.summary,
    source: a.source,
    sentiment: (a as any).sentiment || "unknown",
  }));

  const analysisPrompt = `Analyze these ${simplifiedArticles.length} news articles.

ARTICLES:
${simplifiedArticles.map((a) => `[${a.index}] ${a.title} (${a.source}): ${a.summary}`).join("\n\n")}

USER CONTEXT: ${profile.personaSummary || ctx.persona || "Senior executive"}

TASK: Identify 3-5 major themes from these articles. For each theme:
1. Give it a clear topic name in ${ctx.languageName}
2. Rate importance: "critical" (urgent action needed), "important" (this week), or "background" (monitor)
3. Write a 2-sentence analysis in ${ctx.languageName}
4. Assess sentiment: "positive", "negative", "neutral", or "mixed"
5. List which article indices relate to this theme

You MUST return valid JSON with this exact structure:
{
  "themes": [
    {
      "topic": "Theme name in ${ctx.languageName}",
      "importance": "critical",
      "summary": "2-sentence analysis in ${ctx.languageName}",
      "sentiment": "neutral",
      "confidence": 8,
      "relatedArticles": [0, 2, 5]
    }
  ],
  "opportunities": ["Identified business opportunities"],
  "recommendations": ["Recommended actions"]
}`;

  try {
    console.log("🟢 GPT-5 mini fast analysis...");
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a senior business analyst. Analyze news and return structured JSON analysis in ${ctx.languageName}. Always return valid JSON with a 'themes' array containing 3-5 themes.`,
        },
        { role: "user", content: analysisPrompt },
      ],
      max_completion_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const finishReason = response.choices[0].finish_reason;
    console.log("   GPT-5 mini response length:", content.length, "| finish_reason:", finishReason);

    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());

    return {
      model: "GPT-5 mini",
      provider: "OpenAI",
      layer: "analysis",
      themes: parsed.themes || [],
      opportunities: parsed.opportunities,
      recommendations: parsed.recommendations,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("❌ GPT-5 mini error:", error.message);
    return { model: "GPT-5 mini", provider: "OpenAI", layer: "analysis", themes: [], error: error.message };
  }
}

// =============================================================================
// JUDGE LAYER - CLAUDE OPUS 4.5
// =============================================================================

async function claudeJudge(
  profile: UserProfile,
  searchResults: SearchResult[],
  analysisResults: AnalysisResult[],
  ctx: SearchContext, // Phase 0.3: receive SearchContext with role and decisionContext
  coverage: CoverageResult // Phase 2.17: receive coverage info for mandatory tokoh enforcement
): Promise<EspressoBrief> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const formattedDate = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  const allArticles = searchResults.flatMap((r) =>
    r.articles.map((a) => ({ ...a, foundBy: r.model }))
  );

  const allThemes = analysisResults.flatMap((r) =>
    r.themes.map((t) => ({ ...t, analyzedBy: r.model }))
  );

  const searchModels = searchResults.filter((r) => !r.error && r.articles.length > 0).map((r) => r.model);
  const analysisModels = analysisResults.filter((r) => !r.error && r.themes.length > 0).map((r) => r.model);

  const judgePrompt = `${ECONOMIST_ESPRESSO_PROMPT}

═══════════════════════════════════════════════════════════════
PROFIL PEMBACA
═══════════════════════════════════════════════════════════════

${profile.councilSystemPrompt || profile.personaSummary || "Eksekutif senior Indonesia"}

Kriteria sukses: "${profile.successDefinition || "Menerima intelijen yang actionable untuk keputusan strategis"}"

═══════════════════════════════════════════════════════════════
PERSONALIZATION CONTRACT (Phase 2.1 - NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════

ROLE: ${ctx.role}
DECISION CONTEXT: ${ctx.decisionContext || "(none)"}

STRICT RULES FOR "Mengapa penting" (whyItMatters):

1. WAJIB: Setiap "Mengapa penting" HARUS dimulai dengan:
   "Sebagai ${ctx.role}, ..."

2. JIKA DECISION CONTEXT ada (bukan "(none)"):
   - "Mengapa penting" HARUS menyebut koneksi langsung ke: "${ctx.decisionContext || "(none)"}"
   - Contoh: "Sebagai ${ctx.role}, ini relevan untuk ${ctx.decisionContext || "keputusan Anda"}..."

3. DILARANG: Frasa generik seperti "Bagi eksekutif" atau "Untuk para pemimpin"
   - KECUALI jika ROLE adalah "Eksekutif Korporat (CFO/COO/Head)"

4. KHUSUS untuk ROLE "Konsultan / Advisor":
   - Framing HARUS tentang: implikasi klien, peluang advisory, packaging penawaran,
     sudut pitch, rate card, partnership/subcontracting, atau langkah konkret berikutnya
   - Contoh yang BENAR:
     "Sebagai Konsultan / Advisor, kekurangan talenta cyber ini membuka peluang
     partnership dengan vendor training untuk menawarkan paket upskilling ke klien
     enterprise Anda dengan margin konsultasi 30-40%."
   - Contoh yang SALAH:
     "Bagi eksekutif, keamanan siber penting untuk bisnis." (terlalu generik)

═══════════════════════════════════════════════════════════════
DATA DARI SEARCH LAYER (${searchModels.join(", ")})
═══════════════════════════════════════════════════════════════

Total: ${allArticles.length} artikel

${JSON.stringify(allArticles, null, 2)}

═══════════════════════════════════════════════════════════════
ANALISIS DARI ANALYSIS LAYER (${analysisModels.join(", ")})
═══════════════════════════════════════════════════════════════

${JSON.stringify(allThemes, null, 2)}

Risk Assessment (DeepSeek): ${analysisResults.find((r) => r.model === "DeepSeek")?.riskAssessment || "N/A"}

Opportunities: ${JSON.stringify(analysisResults.flatMap((r) => r.opportunities || []))}

═══════════════════════════════════════════════════════════════
INSTRUKSI HAKIM AKHIR
═══════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════╗
║  📰 BRIEF STRUCTURE (Phase 2.19)                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SECTION 1 - BERITA UTAMA (3-4 stories):                      ║
║  • Fresh news from last 48 hours ONLY                         ║
║  • Includes: Topic news + Institusi announcements             ║
║  • NO tokoh stories here - they go in Section 2               ║
║  • Categories: Kritis, Penting                                ║
║                                                               ║
║  SECTION 2 - INSIGHT TOKOH (0-2 stories, optional):           ║
║  • For tracked tokoh: ${coverage.tokohCovered.join(", ") || "none"}
║  • Category: 'Insight' (NOT Kritis or Penting)                ║
║  • CAN be older content - show actual date transparently!     ║
║  • Max 2 stories total for all tokoh combined                 ║
║  • If no quality tokoh content with real URL, skip section    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  🔗 URL INTEGRITY RULE (CRITICAL - ZERO TOLERANCE)            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  • story.url MUST be copied EXACTLY from SearchArticle.url    ║
║  • DO NOT invent, modify, guess, or construct URLs            ║
║  • DO NOT create plausible-looking URLs                       ║
║  • If no valid URL exists, set url to empty string ""         ║
║                                                               ║
║  • story.publishedDate MUST be from same SearchArticle        ║
║  • If date unknown, set publishedDate to empty string ""      ║
║  • NEVER pretend old content is fresh                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  ⚠️ MANDATORY UNIQUENESS RULE (Phase 2.18) ⚠️                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Each 'Mengapa penting' MUST be UNIQUE. No duplicate advice.  ║
║                                                               ║
║  EACH STORY MUST ANSWER A DIFFERENT QUESTION:                 ║
║  • Story 1 (Kritis): Apa TINDAKAN konkret yang harus diambil? ║
║  • Story 2 (Penting): Apa RISIKO yang harus dihindari?        ║
║  • Story 3 (Penting): Apa PELUANG yang terbuka?               ║
║  • Story 4 (Penting): Bagaimana ini mempengaruhi STRATEGI?    ║
║  • Story 5 (Konteks): Apa IMPLIKASI jangka panjang?           ║
║                                                               ║
║  DILARANG:                                                    ║
║  - Menyalin frasa yang sama antar cerita                      ║
║  - Memberikan saran identik dengan kata berbeda               ║
║  - Mengulang call-to-action yang sama                         ║
║                                                               ║
║  Jika dua cerita menghasilkan saran yang sama:                ║
║  → GABUNGKAN menjadi satu cerita                              ║
║  → Pilih cerita LAIN untuk slot tersebut                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

RECENCY RULES (CRITICAL):
- PRIORITIZE articles from the LAST 24 HOURS
- EXCLUDE any news older than 48 hours UNLESS it's a major breaking story still developing
- If publishedDate is missing or unclear, verify recency from context
- Today's date: ${dateStr}

CURATION PROCESS:
1. DEDUPLIKASI: Gabungkan berita sama dari berbagai sumber
2. RECENCY CHECK: Filter out stale news (>48 hours old)
3. VERIFIKASI: Beri score 1-10 (bonus jika multiple sources agree)
4. KURASI: Pilih 3-5 berita TERBARU dan terpenting dengan gaya Economist Espresso
5. PERSONALISASI: "Why it matters" HARUS spesifik untuk user ini
6. EDITORIAL: Tulis dengan tajam, witty, insightful

OUTPUT JSON (Bahasa Indonesia yang elegan):
{
  "briefDate": "${dateStr}",
  "edition": "${formattedDate}",
  "recipientName": "${profile.personaSummary?.split(".")[0] || "Eksekutif"}",
  "greeting": "Selamat pagi yang elegan dan personal",
  "executiveThesis": "Single sentence (max 30 words), non-neutral, time-bound thesis. Example: Q1 2026 adalah jendela terakhir bagi startup AI Indonesia untuk mengamankan compute sebelum pengetatan global.",
  "theWorldInBrief": "2-3 kalimat overview tajam tentang hari ini",
  "topStories": [
    {
      "headline": "Headline yang menarik dan informatif",
      "body": "2-3 kalimat dengan gaya Economist - witty tapi serius",
      "whyItMatters": "Relevansi SPESIFIK untuk user ini",
      "source": "Nama sumber",
      "sourceType": "local|regional|global|social",
      "url": "URL valid",
      "verificationScore": 9,
      "category": "critical|important|background",
      "sentiment": "positive|negative|neutral|mixed",
      "isBreaking": false,
      "isSocialTrending": false
    }
  ],
  "tokohInsights": [
    {
      "headline": "Tokoh insight headline",
      "body": "2-3 sentences",
      "whyItMatters": "Why this insight matters for user role",
      "category": "Insight",
      "verificationScore": 7,
      "source": "Source name",
      "url": "EXACT URL from search results or empty string",
      "publishedDate": "Actual date or empty string",
      "recencyLabel": "Insight"
    }
  ],
  "marketsSnapshot": "Ringkasan pasar jika relevan (opsional)",
  "quotaOfTheDay": {
    "quote": "Kutipan menarik dari berita hari ini",
    "source": "Sumber kutipan"
  },
  "agendaAhead": ["Event/deadline penting yang perlu dipantau"],
  "councilConsensus": "Catatan konsensus AI Council tentang hari ini",
  "confidenceScore": 8.5,
  "sourcesUsed": {
    "search": ${JSON.stringify(searchModels)},
    "analysis": ${JSON.stringify(analysisModels)}
  }
}`;

  try {
    const judgeModel = AI_COUNCIL_V2.claude.model;
    console.log("🟤 Claude Opus 4.5 - HAKIM AKHIR deliberating...");
    const response = await anthropic.messages.create({
      model: judgeModel,
      max_tokens: 4096,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    let brief: EspressoBrief = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());

    // Phase 2.19: Ensure tokohInsights is always an array
    if (!brief.tokohInsights) {
      brief.tokohInsights = [];
    }

    // Phase 2.2: Validate whyItMatters and auto-repair if needed
    const violations = validateWhyItMatters(
      ctx.role,
      ctx.decisionContext,
      brief.topStories || []
    );

    if (violations.length > 0 && violations.length <= 5) {
      console.log(`⚠️  Phase 2.2: ${violations.length} whyItMatters violations detected, initiating repair...`);
      violations.forEach(v => {
        console.log(`   - Story ${v.index}: ${v.reasons.join(", ")}`);
      });

      // Build repair prompt
      const repairPrompt = `You are a personalization specialist. Fix the whyItMatters fields that violate the rules.

ROLE: ${ctx.role}
DECISION CONTEXT: ${ctx.decisionContext || "(none)"}

RULES:
1. Every whyItMatters MUST start with: "Sebagai ${ctx.role}, ..."
2. If DECISION CONTEXT exists, whyItMatters MUST mention connection to: "${ctx.decisionContext || "(none)"}"
3. BANNED: Generic phrases like "Bagi eksekutif" (unless role is "Eksekutif Korporat (CFO/COO/Head)")

VIOLATIONS TO FIX:
${violations.map(v => `
Story ${v.index}:
  - Headline: "${brief.topStories?.[v.index]?.headline || "N/A"}"
  - Current whyItMatters: "${v.original}"
  - Problems: ${v.reasons.join(", ")}
`).join("\n")}

OUTPUT JSON (array of patches):
[
  {
    "index": 0,
    "whyItMatters": "Sebagai ${ctx.role}, ... (fixed version with proper personalization)"
  }
]

Return ONLY the JSON array. Each patch fixes one story.`;

      try {
        const repairResponse = await anthropic.messages.create({
          model: judgeModel,
          max_tokens: 2048,
          messages: [{ role: "user", content: repairPrompt }],
        });

        const repairContent = repairResponse.content[0].type === "text" ? repairResponse.content[0].text : "[]";
        const patches: Array<{ index: number; whyItMatters: string }> = JSON.parse(
          repairContent.replace(/```json\n?|\n?```/g, "").trim()
        );

        // Apply patches
        patches.forEach(patch => {
          if (brief.topStories?.[patch.index]) {
            brief.topStories[patch.index].whyItMatters = patch.whyItMatters;
            console.log(`   ✅ Repaired story ${patch.index}`);
          }
        });

        // Re-validate after repair
        const postRepairViolations = validateWhyItMatters(
          ctx.role,
          ctx.decisionContext,
          brief.topStories || []
        );

        if (postRepairViolations.length > 0) {
          console.log(`⚠️  ${postRepairViolations.length} violations remain after repair`);
        } else {
          console.log(`✅ All whyItMatters fields now comply with personalization rules`);
        }
      } catch (repairError: any) {
        console.error("⚠️  Repair call failed, returning original brief:", repairError.message);
      }
    } else if (violations.length > 5) {
      console.log(`⚠️  Phase 2.2: ${violations.length} violations (>5), skipping repair to avoid token waste`);
    } else {
      console.log(`✅ Phase 2.2: All whyItMatters fields comply with personalization rules`);
    }

    return brief;
  } catch (error: any) {
    console.error("❌ Claude Judge error:", error.message);
    throw error;
  }
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

export async function runCouncilV2(
  userId: string,
  providedProfile?: Partial<UserProfile>
): Promise<{
  success: boolean;
  profile?: UserProfile;
  searchResults?: SearchResult[];
  analysisResults?: AnalysisResult[];
  brief?: EspressoBrief;
  timing?: {
    searchLayerMs: number;
    analysisLayerMs: number;
    judgeLayerMs: number;
    totalMs: number;
  };
  error?: string;
}> {
  const totalStart = Date.now();

  console.log("");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("🏛️  KURASI.AI COUNCIL V2 - 3-LAYER ARCHITECTURE");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("");

  // Get user profile - use provided profile or fetch from DB
  let profile: UserProfile;

  if (providedProfile) {
    // Use provided profile (for public onboarding without DB user)
    // role is required - default to "Lainnya" if not provided
    profile = {
      id: "temp-" + Date.now(),
      userId: userId,
      role: providedProfile.role || "Lainnya", // Required field
      decisionContext: providedProfile.decisionContext || null, // Optional field
      personaSummary: providedProfile.personaSummary || null,
      roleDescription: providedProfile.roleDescription || null,
      organizationContext: providedProfile.organizationContext || null,
      primaryTopics: providedProfile.primaryTopics || [],
      secondaryTopics: providedProfile.secondaryTopics || [],
      keywordsToTrack: providedProfile.keywordsToTrack || null,
      entitiesToTrack: providedProfile.entitiesToTrack || null,
      preferredSources: providedProfile.preferredSources || [],
      avoidTopics: providedProfile.avoidTopics || null,
      languagePreference: providedProfile.languagePreference || "id",
      councilSystemPrompt: providedProfile.councilSystemPrompt || null,
      successDefinition: providedProfile.successDefinition || null,
    };
    console.log(`👤 Guest User (onboarding) - Role: ${profile.role}`);
  } else {
    // Fetch from database
    const [dbProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!dbProfile) {
      return { success: false, error: "User profile not found. Complete onboarding first." };
    }
    profile = dbProfile;
    console.log(`👤 User: ${profile.personaSummary?.split(".")[0] || userId}`);
  }

  // Phase 0.3: Build SearchContext once for use in analysis and judge layers
  // This ensures role and decisionContext are propagated through all layers
  const searchContext = buildSearchContext(profile);

  // Check API availability
  const apis = {
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    grok: !!process.env.XAI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };

  console.log("\n📊 API Status:");
  console.log(`   SEARCH:   Perplexity ${apis.perplexity ? "✅" : "❌"} | Gemini ${apis.gemini ? "✅" : "❌"} | Grok ${apis.grok ? "✅" : "❌"}`);
  console.log(`   ANALYSIS: DeepSeek ${apis.deepseek ? "✅" : "❌"} | GPT-5 mini ${apis.openai ? "✅" : "❌"}`);
  console.log(`   JUDGE:    Claude Opus 4.5 ${apis.anthropic ? "✅" : "❌"}`);

  if (!apis.anthropic) {
    return { success: false, error: "Claude (Anthropic) is required as HAKIM AKHIR" };
  }

  // ==========================================================================
  // LAYER 1: SEARCH (Parallel)
  // ==========================================================================
  console.log("\n" + "─".repeat(60));
  console.log("🔍 LAYER 1: SEARCH (parallel)");
  console.log("─".repeat(60));

  const searchStart = Date.now();
  const searchPromises: Promise<SearchResult>[] = [];

  if (apis.perplexity) searchPromises.push(searchWithPerplexity(profile));
  if (apis.gemini) searchPromises.push(searchWithGemini(profile));
  if (apis.grok) searchPromises.push(searchWithGrok(profile));

  if (searchPromises.length === 0) {
    console.log("⚠️  No search APIs configured, using Claude alone...");
  }

  const rawSearchResults = await Promise.all(searchPromises);
  const searchLayerMs = Date.now() - searchStart;

  console.log(`\n📊 Raw Search Results (${searchLayerMs}ms):`);
  rawSearchResults.forEach((r) => {
    const status = r.error ? "❌" : "✅";
    console.log(`   ${status} ${r.model}: ${r.articles.length} articles (${r.latencyMs || 0}ms)`);
  });

  const rawTotalArticles = rawSearchResults.reduce((sum, r) => sum + r.articles.length, 0);

  // Phase 1.2: Dedupe search results
  const dedupedResults = dedupeSearchResults(rawSearchResults);
  const dedupedTotalArticles = dedupedResults.reduce((sum, r) => sum + r.articles.length, 0);
  const duplicatesRemoved = rawTotalArticles - dedupedTotalArticles;

  console.log(`   📚 Total: ${rawTotalArticles} articles → ${dedupedTotalArticles} after dedupe (${duplicatesRemoved} duplicates removed)`);

  // Phase 1.2: Compute coverage and generate warnings
  const queryResult = generateSearchQueries(searchContext);
  const coverage = computeCoverage(dedupedResults, queryResult.requirements);

  // Log coverage status
  if (coverage.tokohCovered.length > 0 || coverage.tokohMissing.length > 0) {
    console.log(`   👤 Tokoh: ${coverage.tokohCovered.length} covered, ${coverage.tokohMissing.length} missing`);
  }
  if (coverage.institusiCovered.length > 0 || coverage.institusiMissing.length > 0) {
    console.log(`   🏛️  Institusi: ${coverage.institusiCovered.length} covered, ${coverage.institusiMissing.length} missing`);
  }
  if (coverage.warnings.length > 0) {
    console.log(`   ⚠️  Coverage warnings: ${coverage.warnings.length}`);
    coverage.warnings.forEach(w => console.log(`      - ${w}`));
  }

  // Add coverage warnings as synthetic search result for downstream layers
  const coverageWarningResult = createCoverageWarningResult(coverage);

  // Phase 1.3: Apply safe cap AFTER dedupe + coverage guardrail
  // Cap real results to MAX_CANDIDATES_FOR_ANALYSIS, but never drop CoverageGuardrail
  let cappedResults = dedupedResults;
  const totalBeforeCap = dedupedResults.reduce((sum, r) => sum + r.articles.length, 0);

  if (totalBeforeCap > MAX_CANDIDATES_FOR_ANALYSIS) {
    // Cap articles across all search results proportionally
    let remaining = MAX_CANDIDATES_FOR_ANALYSIS;
    cappedResults = dedupedResults.map(r => {
      if (remaining <= 0) {
        return { ...r, articles: [] };
      }
      const take = Math.min(r.articles.length, remaining);
      remaining -= take;
      return { ...r, articles: r.articles.slice(0, take) };
    }).filter(r => r.articles.length > 0 || r.error);

    console.log(`   ✂️  Capped: ${totalBeforeCap} → ${MAX_CANDIDATES_FOR_ANALYSIS} articles for analysis`);
  }

  // Append coverage guardrail (never dropped)
  const searchResults = coverageWarningResult
    ? [...cappedResults, coverageWarningResult]
    : cappedResults;

  const totalArticles = searchResults.reduce((sum, r) => sum + r.articles.length, 0);

  // ==========================================================================
  // LAYER 2: ANALYSIS (Parallel)
  // ==========================================================================
  console.log("\n" + "─".repeat(60));
  console.log("🧠 LAYER 2: ANALYSIS (parallel)");
  console.log("─".repeat(60));

  const analysisStart = Date.now();
  const analysisPromises: Promise<AnalysisResult>[] = [];

  // Phase 0.3: Pass searchContext to analysis functions (contains role and decisionContext)
  if (apis.deepseek && totalArticles > 0) analysisPromises.push(analyzeWithDeepSeek(profile, searchResults, searchContext));
  if (apis.openai && totalArticles > 0) analysisPromises.push(analyzeWithGPT(profile, searchResults, searchContext));

  const analysisResults = await Promise.all(analysisPromises);
  const analysisLayerMs = Date.now() - analysisStart;

  console.log(`\n📊 Analysis Results (${analysisLayerMs}ms):`);
  analysisResults.forEach((r) => {
    const status = r.error ? "❌" : "✅";
    console.log(`   ${status} ${r.model}: ${r.themes.length} themes (${r.latencyMs || 0}ms)`);
  });

  // ==========================================================================
  // LAYER 3: JUDGE (Claude Opus 4.5)
  // ==========================================================================
  console.log("\n" + "─".repeat(60));
  console.log("⚖️  LAYER 3: JUDGE (Claude Opus 4.5 - HAKIM AKHIR)");
  console.log("─".repeat(60));

  const judgeStart = Date.now();
  // Phase 0.3: Pass searchContext to judge function (contains role and decisionContext)
  // Phase 2.17: Pass coverage to enforce mandatory tokoh rule
  const brief = await claudeJudge(profile, searchResults, analysisResults, searchContext, coverage);
  const judgeLayerMs = Date.now() - judgeStart;

  console.log(`\n✅ Brief generated (${judgeLayerMs}ms)`);
  console.log(`   📰 Stories: ${brief.topStories?.length || 0}`);
  console.log(`   🎯 Confidence: ${brief.confidenceScore}/10`);

  // ==========================================================================
  // SAVE TO DATABASE (skip for guest users)
  // ==========================================================================
  const totalMs = Date.now() - totalStart;

  if (!userId.startsWith("guest-")) {
    await db.insert(dailyBriefs).values({
      userId,
      content: brief,
      councilMetadata: {
        version: "v2",
        architecture: "3-layer",
        searchResults: searchResults.map((r) => ({
          model: r.model,
          articles: r.articles.length,
          error: r.error,
          latencyMs: r.latencyMs,
        })),
        analysisResults: analysisResults.map((r) => ({
          model: r.model,
          themes: r.themes.length,
          error: r.error,
          latencyMs: r.latencyMs,
        })),
        timing: { searchLayerMs, analysisLayerMs, judgeLayerMs, totalMs },
      },
    });
  }

  console.log("\n" + "═".repeat(60));
  console.log("🏛️  COUNCIL V2 COMPLETE");
  console.log(`⏱️  Total: ${totalMs}ms (Search: ${searchLayerMs}ms | Analysis: ${analysisLayerMs}ms | Judge: ${judgeLayerMs}ms)`);
  console.log("═".repeat(60) + "\n");

  return {
    success: true,
    profile,
    searchResults,
    analysisResults,
    brief,
    timing: { searchLayerMs, analysisLayerMs, judgeLayerMs, totalMs },
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function getCouncilV2Status() {
  return {
    version: "v2",
    architecture: "3-layer",
    layers: {
      search: {
        perplexity: { ok: !!process.env.PERPLEXITY_API_KEY, ...AI_COUNCIL_V2.perplexity },
        gemini: { ok: !!process.env.GOOGLE_AI_API_KEY, ...AI_COUNCIL_V2.gemini },
        grok: { ok: !!process.env.XAI_API_KEY, ...AI_COUNCIL_V2.grok },
      },
      analysis: {
        deepseek: { ok: !!process.env.DEEPSEEK_API_KEY, ...AI_COUNCIL_V2.deepseek },
        openai: { ok: !!process.env.OPENAI_API_KEY, ...AI_COUNCIL_V2.openai },
      },
      judge: {
        claude: { ok: !!process.env.ANTHROPIC_API_KEY, ...AI_COUNCIL_V2.claude },
      },
    },
  };
}

export async function getLatestBriefV2(userId: string) {
  const [brief] = await db
    .select()
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, userId))
    .orderBy(desc(dailyBriefs.generatedAt))
    .limit(1);

  return brief;
}

// Export for testing (Phase 0.2)
export { buildSearchContext };
export type { SearchContext, UserProfile };

// Export for testing (Phase 1.1)
export { generateSearchQueries, classifyEntity };
export type { SearchQueryResult };

// Export for testing (Phase 1.2)
export { normalizeUrl, normalizeTitle, dedupeSearchResults, computeCoverage, createCoverageWarningResult };
export type { CoverageResult };

// Export for testing (Phase 1.3)
export { MAX_CANDIDATES_FOR_ANALYSIS };

/**
 * Test helper: applies the exact cap logic used in runCouncilV2 orchestrator.
 * Exported only for testing purposes.
 */
export function __test_applyCapAndGuardrail(
  dedupedResults: SearchResult[],
  coverageWarningResult: SearchResult | null
): SearchResult[] {
  let cappedResults = dedupedResults;
  const totalBeforeCap = dedupedResults.reduce((sum, r) => sum + r.articles.length, 0);

  if (totalBeforeCap > MAX_CANDIDATES_FOR_ANALYSIS) {
    let remaining = MAX_CANDIDATES_FOR_ANALYSIS;
    cappedResults = dedupedResults.map(r => {
      if (remaining <= 0) {
        return { ...r, articles: [] };
      }
      const take = Math.min(r.articles.length, remaining);
      remaining -= take;
      return { ...r, articles: r.articles.slice(0, take) };
    }).filter(r => r.articles.length > 0 || r.error);
  }

  return coverageWarningResult
    ? [...cappedResults, coverageWarningResult]
    : cappedResults;
}
