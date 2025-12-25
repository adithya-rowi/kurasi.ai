import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "../db";
import { userProfiles, dailyBriefs, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const AI_COUNCIL = {
  anthropic: {
    name: "Claude Opus 4.5",
    model: "claude-opus-4-5-20251101",
    provider: "Anthropic",
    icon: "🟤",
    color: "#d4a574",
    isJudge: true,
    bestFor: "HAKIM AKHIR - Final judgment",
  },
  openai: {
    name: "GPT-5.2",
    model: "gpt-5.2",
    provider: "OpenAI",
    icon: "🟢",
    color: "#10a37f",
    bestFor: "General reasoning",
  },
  deepseek: {
    name: "DeepSeek V3",
    model: "deepseek-chat",
    provider: "DeepSeek",
    icon: "🟣",
    color: "#7c3aed",
    bestFor: "Cost-efficient & ASEAN coverage",
  },
  perplexity: {
    name: "Perplexity",
    model: "sonar",
    provider: "Perplexity",
    icon: "🔴",
    color: "#1fb8cd",
    isRealTime: true,
    bestFor: "REAL-TIME web search",
  },
  gemini: {
    name: "Gemini 3 Pro",
    model: "gemini-3-flash-preview",
    provider: "Google",
    icon: "🔵",
    color: "#4285f4",
    bestFor: "Long context & Google data",
  },
  grok: {
    name: "Grok 4",
    model: "grok-4",
    provider: "xAI",
    icon: "🟠",
    color: "#f97316",
    bestFor: "X/Twitter data",
  },
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    })
  : null;

const perplexity = process.env.PERPLEXITY_API_KEY
  ? new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    })
  : null;

const grok = process.env.XAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    })
  : null;

const geminiApiKey = process.env.GOOGLE_AI_API_KEY;

const TRUST_REQUIREMENTS = `
ATURAN VERIFIKASI (WAJIB!):

1. HANYA sertakan berita yang Anda YAKIN benar
   - Jika ragu, JANGAN sertakan
   - Lebih baik 3 berita valid daripada 5 berita meragukan

2. SETIAP artikel HARUS punya:
   - URL yang valid (bukan karangan)
   - Sumber yang bisa diverifikasi
   - Tanggal publikasi

3. SKOR VERIFIKASI (1-10):
   - 9-10: Dari sumber resmi (BI, OJK, pemerintah, perusahaan langsung)
   - 7-8: Dari media terpercaya (Kontan, Bisnis Indonesia, Reuters, Bloomberg)
   - 5-6: Dari media umum (Kompas, Detik)
   - 1-4: Dari sumber tidak terverifikasi (JANGAN GUNAKAN)

4. ANTI MISINFORMASI:
   - Jangan sertakan berita dari sumber yang dikenal menyebar hoax
   - Jangan sertakan opini sebagai fakta
   - Jangan sertakan rumor tanpa konfirmasi
   - Jika berita kontroversial, sertakan multiple sources

5. PAYWALL:
   - Jika sumber berbayar, set isPaywalled: true
   - Tetap sertakan jika relevan - user mungkin punya akses
   - Jangan coba bypass paywall

INGAT: User kita adalah pemimpin yang keputusannya berdampak besar.
SATU informasi salah bisa berakibat fatal. BE RESPONSIBLE.
`;

const INDONESIAN_FIRST_SEARCH_PROMPT = `
PRIORITAS SUMBER (PENTING!):

1. 🇮🇩 INDONESIA FIRST (Prioritas Utama):
   - Kontan.co.id (bisnis, keuangan)
   - Bisnis Indonesia / Bisnis.com
   - Kompas.com (general news)
   - CNBC Indonesia
   - Tempo.co
   - Katadata.co.id
   - The Jakarta Post

2. 🌏 ASEAN & REGIONAL (Kedua):
   - The Straits Times (Singapore)
   - Nikkei Asia
   - Channel News Asia

3. 🌍 GLOBAL FINANCIAL (Ketiga):
   - Bloomberg
   - Reuters
   - Financial Times

ATURAN:
- MINIMAL 60% harus dari sumber Indonesia
- Sumber internasional hanya jika ada dampak langsung ke Indonesia
- Jika berita sama ada di lokal dan internasional, PILIH sumber lokal
`;

interface FoundArticle {
  title: string;
  summary: string;
  source: string;
  sourceType: "local" | "regional" | "global";
  url: string;
  isPaywalled: boolean;
  relevanceReason: string;
  publishedDate: string;
  confidence: number;
  isRealTime?: boolean;
}

interface SearchResult {
  model: string;
  provider: string;
  articles: FoundArticle[];
  searchQueries?: string[];
  error?: string;
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

interface DailyBriefContent {
  briefDate: string;
  recipientName: string;
  greeting: string;
  executiveSummary: string;
  critical: BriefArticle[];
  important: BriefArticle[];
  background: BriefArticle[];
  councilAgreement: string;
  confidenceNote: string;
  modelsUsed?: string[];
}

interface BriefArticle {
  title: string;
  summary: string;
  source: string;
  sourceType: "local" | "regional" | "global";
  url: string;
  isPaywalled: boolean;
  whyItMatters: string;
  foundByPerspectives: string[];
  verificationScore: number;
  publishedDate?: string;
  isRealTime?: boolean;
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  return profile || null;
}

function createSearchPrompt(profile: UserProfile): string {
  const today = new Date().toISOString().split("T")[0];

  return `${profile.councilSystemPrompt || `Anda mencari berita untuk ${profile.personaSummary || "seorang eksekutif Indonesia"}`}

${INDONESIAN_FIRST_SEARCH_PROMPT}

${TRUST_REQUIREMENTS}

TANGGAL: ${today}
BAHASA OUTPUT: Bahasa Indonesia

CARI 3-5 BERITA PALING RELEVAN (24-48 jam terakhir).

Prioritas topik:
${profile.primaryTopics ? JSON.stringify(profile.primaryTopics, null, 2) : "- Berita bisnis dan industri umum"}

Entitas yang dipantau:
${profile.entitiesToTrack?.join(", ") || "Pemain industri utama dan regulator"}

FORMAT JSON:
{
  "searchQueries": ["query yang digunakan"],
  "articles": [
    {
      "title": "Judul (bahasa asli)",
      "summary": "Ringkasan 2-3 kalimat dalam Bahasa Indonesia",
      "source": "Nama sumber",
      "sourceType": "local|regional|global",
      "url": "URL lengkap atau 'perlu verifikasi'",
      "isPaywalled": true/false,
      "relevanceReason": "Relevansi untuk user ini",
      "publishedDate": "${today}",
      "confidence": 1-10
    }
  ]
}

Respond ONLY with valid JSON.`;
}

async function searchWithAnthropic(prompt: string): Promise<SearchResult> {
  try {
    console.log("🟤 Claude Opus 4.5 searching...");
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []);

    return { model: "Claude", provider: "Anthropic", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ Claude error:", error.message);
    return { model: "Claude", provider: "Anthropic", articles: [], error: error.message };
  }
}

async function searchWithOpenAI(prompt: string): Promise<SearchResult> {
  if (!openai) {
    return { model: "GPT-5.2", provider: "OpenAI", articles: [], error: "Not configured" };
  }

  try {
    console.log("🟢 GPT-5.2 searching...");
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: "You are a news research assistant for Indonesian executives. Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []);

    return { model: "GPT-5.2", provider: "OpenAI", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ GPT-5.2 error:", error.message);
    return { model: "GPT-5.2", provider: "OpenAI", articles: [], error: error.message };
  }
}

async function searchWithDeepSeek(prompt: string): Promise<SearchResult> {
  if (!deepseek) {
    return { model: "DeepSeek", provider: "DeepSeek", articles: [], error: "Not configured" };
  }

  try {
    console.log("🟣 DeepSeek searching...");
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a news research assistant. Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []);

    return { model: "DeepSeek", provider: "DeepSeek", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ DeepSeek error:", error.message);
    return { model: "DeepSeek", provider: "DeepSeek", articles: [], error: error.message };
  }
}

async function searchWithPerplexity(prompt: string): Promise<SearchResult> {
  if (!perplexity) {
    return { model: "Perplexity", provider: "Perplexity", articles: [], error: "Not configured" };
  }

  try {
    console.log("🔴 Perplexity searching LIVE web...");
    const response = await perplexity.chat.completions.create({
      model: "sonar",
      messages: [
        { role: "system", content: "You search the LIVE web for latest Indonesian business news. Include source URLs. Respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []).map((a) => ({
      ...a,
      isRealTime: true,
      confidence: Math.min((a.confidence || 7) + 1, 10),
    }));

    return { model: "Perplexity", provider: "Perplexity", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ Perplexity error:", error.message);
    return { model: "Perplexity", provider: "Perplexity", articles: [], error: error.message };
  }
}

async function searchWithGemini(prompt: string): Promise<SearchResult> {
  if (!geminiApiKey) {
    return { model: "Gemini 3 Pro", provider: "Google", articles: [], error: "Not configured" };
  }

  try {
    console.log("🔵 Gemini 3 Pro searching...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []);

    return { model: "Gemini 3 Pro", provider: "Google", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ Gemini 3 Pro error:", error.message);
    return { model: "Gemini 3 Pro", provider: "Google", articles: [], error: error.message };
  }
}

async function searchWithGrok(prompt: string): Promise<SearchResult> {
  if (!grok) {
    return { model: "Grok 4", provider: "xAI", articles: [], error: "Not configured" };
  }

  try {
    console.log("🟠 Grok 4 searching (X/Twitter)...");
    const response = await grok.chat.completions.create({
      model: "grok-4",
      messages: [
        {
          role: "system",
          content: `You are Grok with access to X/Twitter data. Search for trending topics, what influential accounts are saying, and breaking news. Respond with valid JSON.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    const articles = normalizeArticles(parsed.articles || []);

    return { model: "Grok 4", provider: "xAI", articles, searchQueries: parsed.searchQueries };
  } catch (error: any) {
    console.error("❌ Grok 4 error:", error.message);
    return { model: "Grok 4", provider: "xAI", articles: [], error: error.message };
  }
}

function normalizeArticles(articles: any[]): FoundArticle[] {
  return articles.map((a) => ({
    title: a.title || "",
    summary: a.summary || "",
    source: a.source || "",
    sourceType: a.sourceType || "local",
    url: a.url || "perlu verifikasi",
    isPaywalled: a.isPaywalled ?? false,
    relevanceReason: a.relevanceReason || a.whyItMatters || "",
    publishedDate: a.publishedDate || new Date().toISOString().split("T")[0],
    confidence: a.confidence || 7,
    isRealTime: a.isRealTime || false,
  }));
}

async function claudeJudge(
  profile: UserProfile,
  allArticles: Array<FoundArticle & { foundBy: string }>,
  modelsUsed: string[]
): Promise<DailyBriefContent> {
  const today = new Date().toISOString().split("T")[0];

  const judgePrompt = `Anda adalah HAKIM AKHIR dalam Dewan AI Kurasi.ai untuk kurasi berita.

PROFIL PENGGUNA:
${profile.councilSystemPrompt || profile.personaSummary || "Eksekutif Indonesia"}

KRITERIA SUKSES:
"${profile.successDefinition || "Menerima intelijen yang actionable untuk membuat keputusan lebih baik"}"

---

DEWAN AI YANG BERPARTISIPASI: ${modelsUsed.join(", ")}

Catatan khusus:
- Artikel dari Perplexity = REAL-TIME dari web (sangat fresh)
- Artikel dari Grok = dari X/Twitter (social sentiment)

TOTAL ARTIKEL: ${allArticles.length}

ARTIKEL:
${JSON.stringify(allArticles, null, 2)}

---

TUGAS:

1. DEDUPLIKASI - Gabungkan berita sama, catat foundByPerspectives
2. VERIFIKASI - URL valid? Sumber kredibel?
3. KATEGORIKAN:
   🔴 KRITIS (1-3): Perlu tindakan HARI INI
   🟡 PENTING (3-5): Perlu tahu minggu ini
   🟢 LATAR (2-4): Untuk dipantau
4. PERSONALISASI - "whyItMatters" SPESIFIK untuk user ini
5. TRUST SCORE (1-10):
   - 9-10: Sumber resmi + multiple AI agree
   - 7-8: Media terpercaya
   - 5-6: Perlu verifikasi
   - Bonus +1 jika dari Perplexity (real-time)

OUTPUT JSON (Bahasa Indonesia):
{
  "briefDate": "${today}",
  "recipientName": "${profile.personaSummary?.split(".")[0] || "Eksekutif"}",
  "greeting": "Selamat pagi yang personal",
  "executiveSummary": "2-3 kalimat ringkasan PERSONAL",
  "modelsUsed": ${JSON.stringify(modelsUsed)},
  "critical": [{
    "title": "...",
    "summary": "...",
    "source": "Nama sumber",
    "sourceType": "local|regional|global",
    "url": "URL lengkap",
    "isPaywalled": boolean,
    "whyItMatters": "PERSONAL untuk user ini",
    "foundByPerspectives": ["Claude Opus 4.5", "GPT-5.2"],
    "verificationScore": 9,
    "publishedDate": "YYYY-MM-DD",
    "isRealTime": boolean
  }],
  "important": [...],
  "background": [...],
  "councilAgreement": "Catatan konsensus AI Council",
  "confidenceNote": "Kepercayaan keseluruhan"
}

Respond ONLY with valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 4096,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    return JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
  } catch (error: any) {
    console.error("Claude Judge error:", error);
    throw error;
  }
}

export async function runCouncilForUser(userId: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  councilResults?: SearchResult[];
  finalBrief?: DailyBriefContent;
  error?: string;
}> {
  console.log("");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("🏛️  KURASI.AI - DEWAN AI MULAI BEKERJA");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("");

  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      success: false,
      error: "User profile not found. Complete onboarding first.",
    };
  }

  console.log(`👤 User: ${profile.personaSummary?.split(".")[0] || userId}`);

  const apis = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    grok: !!process.env.XAI_API_KEY,
  };

  const configuredCount = Object.values(apis).filter(Boolean).length;
  console.log(`\n✅ ${configuredCount}/6 AI models configured`);
  console.log("📊 Active models:");
  if (apis.anthropic) console.log("   🟤 Claude Opus 4.5 (Anthropic) - HAKIM AKHIR");
  if (apis.openai) console.log("   🟢 GPT-5.2 (OpenAI)");
  if (apis.deepseek) console.log("   🟣 DeepSeek");
  if (apis.perplexity) console.log("   🔴 Perplexity - REAL-TIME WEB");
  if (apis.gemini) console.log("   🔵 Gemini (Google)");
  if (apis.grok) console.log("   🟠 Grok (xAI) - X/Twitter");
  console.log("");

  const searchPrompt = createSearchPrompt(profile);

  const searches: Promise<SearchResult>[] = [];

  if (apis.anthropic) searches.push(searchWithAnthropic(searchPrompt));
  if (apis.openai) searches.push(searchWithOpenAI(searchPrompt));
  if (apis.deepseek) searches.push(searchWithDeepSeek(searchPrompt));
  if (apis.perplexity) searches.push(searchWithPerplexity(searchPrompt));
  if (apis.gemini) searches.push(searchWithGemini(searchPrompt));
  if (apis.grok) searches.push(searchWithGrok(searchPrompt));

  if (searches.length === 0) {
    return { success: false, error: "No API keys configured!" };
  }

  console.log(`🚀 Running ${searches.length} AI models in parallel...\n`);

  const startTime = Date.now();
  const results = await Promise.all(searches);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n📊 HASIL PENCARIAN DEWAN AI:");
  console.log("─".repeat(50));
  results.forEach((r) => {
    const status = r.error ? "❌" : "✅";
    const badge = r.model === "Perplexity" ? " [REAL-TIME]" : r.model === "Grok" ? " [X/Twitter]" : "";
    console.log(`${status} ${r.model} (${r.provider}): ${r.articles.length} artikel${badge}`);
  });
  console.log("─".repeat(50));
  console.log(`⏱️  Waktu total: ${duration} detik`);

  const allArticles = results.flatMap((r) =>
    r.articles.map((a) => ({
      ...a,
      foundBy: r.model,
    }))
  );

  const configuredModels = results.filter((r) => !r.error).map((r) => r.model);
  const successfulModels = results.filter((r) => !r.error && r.articles.length > 0).map((r) => r.model);
  const modelsToReport = successfulModels.length > 0 ? successfulModels : configuredModels;
  console.log(`\n📚 Total: ${allArticles.length} artikel dari ${successfulModels.length} model\n`);

  if (allArticles.length === 0) {
    const fallbackBrief: DailyBriefContent = {
      briefDate: new Date().toISOString().split("T")[0],
      recipientName: profile.personaSummary?.split(".")[0] || "Eksekutif",
      greeting: "Selamat pagi!",
      executiveSummary: "Hari ini tidak ada berita kritis yang memerlukan perhatian segera. Pantau perkembangan terbaru.",
      critical: [],
      important: [],
      background: [],
      councilAgreement: "Dewan AI tidak menemukan berita signifikan hari ini.",
      confidenceNote: "Volume rendah - semua model mengembalikan hasil minimal.",
      modelsUsed: configuredModels.length > 0 ? configuredModels : ["Claude"],
    };

    await db.insert(dailyBriefs).values({
      userId,
      content: fallbackBrief,
      councilMetadata: { councilResults: results, generationTime: parseFloat(duration) },
    });

    return { success: true, profile, councilResults: results, finalBrief: fallbackBrief };
  }

  console.log("⚖️ Claude mengevaluasi sebagai Hakim Akhir...\n");

  const modelsForJudge = modelsToReport.includes("Claude") ? modelsToReport : [...modelsToReport, "Claude"];
  const finalBrief = await claudeJudge(profile, allArticles, modelsForJudge);

  if (!finalBrief.modelsUsed || finalBrief.modelsUsed.length === 0) {
    finalBrief.modelsUsed = modelsForJudge;
  }

  await db.insert(dailyBriefs).values({
    userId,
    content: finalBrief,
    councilMetadata: {
      councilResults: results.map((r) => ({
        model: r.model,
        provider: r.provider,
        articlesFound: r.articles.length,
        error: r.error,
      })),
      generationTime: parseFloat(duration),
    },
  });

  console.log("");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("🏛️  BRIEF SELESAI! ✅");
  console.log("🏛️ ══════════════════════════════════════════════════════════════");
  console.log("");

  return {
    success: true,
    profile,
    councilResults: results,
    finalBrief,
  };
}

export function getCouncilStatus() {
  return {
    anthropic: { ok: !!process.env.ANTHROPIC_API_KEY, ...AI_COUNCIL.anthropic },
    openai: { ok: !!process.env.OPENAI_API_KEY, ...AI_COUNCIL.openai },
    deepseek: { ok: !!process.env.DEEPSEEK_API_KEY, ...AI_COUNCIL.deepseek },
    perplexity: { ok: !!process.env.PERPLEXITY_API_KEY, ...AI_COUNCIL.perplexity },
    gemini: { ok: !!process.env.GOOGLE_AI_API_KEY, ...AI_COUNCIL.gemini },
    grok: { ok: !!process.env.XAI_API_KEY, ...AI_COUNCIL.grok },
  };
}

export function getCouncilInfo() {
  return {
    name: "Dewan AI Kurasi.ai",
    description: "Multiple AI models bekerja paralel untuk brief Anda",
    models: Object.values(AI_COUNCIL).map((m) => ({
      name: m.name,
      provider: m.provider,
      icon: m.icon,
      color: m.color,
      bestFor: m.bestFor,
      isJudge: (m as any).isJudge,
      isRealTime: (m as any).isRealTime,
    })),
  };
}

export async function getTodaysBrief(userId: string) {
  const [brief] = await db
    .select()
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, userId))
    .orderBy(desc(dailyBriefs.generatedAt))
    .limit(1);

  return brief;
}

export async function getLatestBrief(userId: string) {
  const [brief] = await db
    .select()
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, userId))
    .orderBy(desc(dailyBriefs.generatedAt))
    .limit(1);

  return brief;
}

export async function getBriefHistory(userId: string, limit = 7) {
  const briefs = await db
    .select()
    .from(dailyBriefs)
    .where(eq(dailyBriefs.userId, userId))
    .orderBy(desc(dailyBriefs.generatedAt))
    .limit(limit);

  return briefs;
}

export { getUserProfile, UserProfile, SearchResult as CouncilMemberResponse };
