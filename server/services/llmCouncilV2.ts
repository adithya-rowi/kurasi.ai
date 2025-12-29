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
  decisionContext: string | null;
}

interface EspressoBrief {
  briefDate: string;
  edition: string;
  recipientName: string;
  greeting: string;
  theWorldInBrief: string;
  topStories: EspressoStory[];
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
}

// =============================================================================
// PROMPTS
// =============================================================================

// =============================================================================
// DYNAMIC SEARCH CONTEXT BUILDER
// =============================================================================

interface SearchContext {
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

function buildSearchPrompt(ctx: SearchContext): string {
  const sections: string[] = [];

  // Add source guidance only if sources are specified
  if (ctx.sources.length > 0) {
    sections.push(`PREFERRED SOURCES: ${ctx.sources.join(", ")}`);
  }

  // Add topics if specified
  if (ctx.topics.length > 0) {
    sections.push(`TOPICS TO COVER: ${ctx.topics.join(", ")}`);
  }

  // Add entities/people to monitor
  if (ctx.entities.length > 0) {
    sections.push(`ENTITIES/PEOPLE TO MONITOR: ${ctx.entities.join(", ")}`);
  }

  // Add keywords
  if (ctx.keywords.length > 0) {
    sections.push(`KEYWORDS TO TRACK: ${ctx.keywords.join(", ")}`);
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

  // If nothing specified, provide minimal guidance
  if (sections.length === 1) {
    sections.unshift("Search for latest relevant news and discussions.");
  }

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

  const searchPrompt = `You are a news search assistant. Search for TODAY'S news only.

${buildSearchPrompt(ctx)}

TANGGAL HARI INI: ${todayIndo} (${today})

CRITICAL: Only include news from the LAST 24 HOURS. Add "berita hari ini ${todayIndo}" to your searches.

Search for 5-7 LATEST news articles published TODAY. Return JSON:
{
  "searchQueries": ["queries used"],
  "articles": [{
    "title": "Title",
    "summary": "2-3 sentence summary in ${ctx.languageName}",
    "source": "Source name",
    "sourceType": "local|regional|global",
    "url": "Full URL",
    "publishedDate": "${today}",
    "confidence": 8,
    "isPaywalled": false
  }]
}

RULES:
- PRIORITIZE articles from the last 24 hours (today's date: ${todayIndo})
- EXCLUDE any news older than 48 hours unless highly relevant breaking news
- Include valid URLs
- Confidence: 9-10 official sources, 7-8 trusted media, 5-6 general media`;

  try {
    console.log("🔴 Perplexity searching web/news...");
    const response = await perplexity.chat.completions.create({
      model: "sonar",
      messages: [
        { role: "system", content: "Search the web for latest Indonesian business news. Return valid JSON with real URLs." },
        { role: "user", content: searchPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());

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
    console.error("❌ Perplexity error:", error.message);
    return { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [], error: error.message };
  }
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

  const searchPrompt = `You are a news search assistant. Search for TODAY'S news only.

IMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no markdown, no text before or after the JSON.

${buildSearchPrompt(ctx)}

TANGGAL HARI INI: ${todayIndo} (${today})

RECENCY RULES:
- Search for "berita hari ini ${todayIndo}" or "latest news today"
- ONLY include articles from the LAST 24 HOURS
- EXCLUDE any news older than 48 hours

Search for 5-7 LATEST news articles published TODAY. Your response must be ONLY this JSON structure:
{"articles":[{"title":"Article title","summary":"2-3 sentence summary in ${ctx.languageName}","source":"Source name","sourceType":"local|regional|global","url":"Full URL","publishedDate":"${today}","confidence":8}]}

Remember: Output ONLY the JSON object, nothing else.`;

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
            maxOutputTokens: 4096,
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

    // Robust JSON parsing: remove markdown first
    textContent = textContent.replace(/```json\n?|\n?```/g, "").trim();

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

    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch (parseError: any) {
      // If JSON parsing fails, log details and return empty articles
      console.error("❌ Gemini JSON parse failed:", parseError.message);
      console.error("   📝 Raw response (first 300 chars):", textContent.substring(0, 300));
      console.error("   📝 Raw response (last 100 chars):", textContent.substring(Math.max(0, textContent.length - 100)));
      console.error("   📝 Text length:", textContent.length);
      console.error("   📝 JSON start index:", jsonStart, "JSON end index:", jsonEnd);
      parsed = { articles: [] };
    }

    const articles: SearchArticle[] = (parsed.articles || []).map((a: any) => ({
      title: a.title || "",
      summary: a.summary || "",
      source: a.source || "",
      sourceType: a.sourceType || "local",
      url: a.url || "",
      publishedDate: a.publishedDate || today,
      confidence: a.confidence || 7,
      isRealTime: true,
      citations,
    }));

    return {
      model: "Gemini",
      provider: "Google",
      layer: "search",
      articles,
      searchQueries: groundingMetadata?.webSearchQueries,
      citations,
      latencyMs: Date.now() - startTime,
    };
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

  // Build search focus based on what user provided
  const searchFocus: string[] = [];
  if (ctx.entities.length > 0) searchFocus.push(`Entities/People: ${ctx.entities.join(", ")}`);
  if (ctx.topics.length > 0) searchFocus.push(`Topics: ${ctx.topics.join(", ")}`);
  if (ctx.keywords.length > 0) searchFocus.push(`Keywords: ${ctx.keywords.join(", ")}`);
  if (ctx.sources.length > 0) searchFocus.push(`Prioritize sources: ${ctx.sources.join(", ")}`);

  const searchPrompt = `Search X/Twitter and web for TODAY'S discussions and news (${todayIndo}).

${searchFocus.length > 0 ? searchFocus.join("\n") : "Search for trending business and finance news."}

RECENCY: LAST 24 HOURS ONLY (since ${yesterday})
- Only include tweets and news from TODAY
- Exclude anything older than 24 hours

FOCUS:
- Tweets from influential accounts (analysts, economists, industry experts)
- Public sentiment and market reactions
- Breaking news and trending discussions
- Key opinion leader insights

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
    "sentiment": "positive|negative|neutral|mixed"
  }],
  "trendingTopics": ["#hashtag1", "#hashtag2"],
  "overallSentiment": "neutral"
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
  searchResults: SearchResult[]
): Promise<AnalysisResult> {
  if (!deepseek) {
    return { model: "DeepSeek", provider: "DeepSeek", layer: "analysis", themes: [], error: "Not configured" };
  }

  const startTime = Date.now();
  const ctx = buildSearchContext(profile);
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
  searchResults: SearchResult[]
): Promise<AnalysisResult> {
  if (!openai) {
    return { model: "GPT-5 mini", provider: "OpenAI", layer: "analysis", themes: [], error: "Not configured" };
  }

  const startTime = Date.now();
  const ctx = buildSearchContext(profile);
  const allArticles = searchResults.flatMap((r) => r.articles);

  // Prepare simplified article data for analysis
  const simplifiedArticles = allArticles.slice(0, 15).map((a, i) => ({
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
  analysisResults: AnalysisResult[]
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
    console.log("🟤 Claude Opus 4.5 - HAKIM AKHIR deliberating...");
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4096,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    return JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
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
    profile = {
      id: "temp-" + Date.now(),
      userId: userId,
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
      decisionContext: providedProfile.decisionContext || null,
    };
    console.log(`👤 Guest User (onboarding)`);
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

  const searchResults = await Promise.all(searchPromises);
  const searchLayerMs = Date.now() - searchStart;

  console.log(`\n📊 Search Results (${searchLayerMs}ms):`);
  searchResults.forEach((r) => {
    const status = r.error ? "❌" : "✅";
    console.log(`   ${status} ${r.model}: ${r.articles.length} articles (${r.latencyMs || 0}ms)`);
  });

  const totalArticles = searchResults.reduce((sum, r) => sum + r.articles.length, 0);
  console.log(`   📚 Total: ${totalArticles} articles from ${searchResults.filter((r) => !r.error).length} sources`);

  // ==========================================================================
  // LAYER 2: ANALYSIS (Parallel)
  // ==========================================================================
  console.log("\n" + "─".repeat(60));
  console.log("🧠 LAYER 2: ANALYSIS (parallel)");
  console.log("─".repeat(60));

  const analysisStart = Date.now();
  const analysisPromises: Promise<AnalysisResult>[] = [];

  if (apis.deepseek && totalArticles > 0) analysisPromises.push(analyzeWithDeepSeek(profile, searchResults));
  if (apis.openai && totalArticles > 0) analysisPromises.push(analyzeWithGPT(profile, searchResults));

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
  const brief = await claudeJudge(profile, searchResults, analysisResults);
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
