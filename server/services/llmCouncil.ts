import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { userProfiles, dailyBriefs, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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

1. INDONESIA FIRST (Prioritas Utama):
   - Kontan.co.id (bisnis, keuangan)
   - Bisnis Indonesia / Bisnis.com
   - Kompas.com (general news)
   - Detik Finance
   - CNN Indonesia
   - CNBC Indonesia
   - Tempo.co
   - Katadata.co.id
   - Investor Daily
   - Infobank
   - The Jakarta Post
   - IDN Times
   - Liputan6 Bisnis

2. ASEAN & REGIONAL (Kedua):
   - The Straits Times (Singapore)
   - Nikkei Asia
   - South China Morning Post
   - Bangkok Post
   - The Star (Malaysia)
   - Channel News Asia

3. GLOBAL FINANCIAL (Ketiga):
   - Bloomberg
   - Reuters
   - Financial Times
   - The Economist
   - Wall Street Journal

4. EXPERT VOICES (Bonus - jika relevan):
   - Blog Bank Indonesia
   - Blog OJK
   - McKinsey Indonesia insights
   - World Bank Indonesia updates
   - IMF Indonesia reports

ATURAN:
- MINIMAL 60% harus dari sumber Indonesia
- Sumber internasional hanya jika ada dampak langsung ke Indonesia
- Jika berita sama ada di lokal dan internasional, PILIH sumber lokal
- Selalu sertakan konteks Indonesia dalam analisis
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
}

interface CouncilMemberResponse {
  perspective: string;
  articles: FoundArticle[];
  searchQueries: string[];
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
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  return profile || null;
}

function createSearchPrompt(profile: UserProfile, perspective: string): string {
  const today = new Date().toISOString().split("T")[0];

  const perspectiveInstructions: Record<string, string> = {
    "Market Analyst": "Fokus pada tren pasar, berita keuangan, dan indikator ekonomi yang mempengaruhi keputusan bisnis.",
    "Regulatory Expert": "Fokus pada perubahan kebijakan, update regulasi, dan berita compliance dari badan pemerintah.",
    "Industry Insider": "Fokus pada berita industri spesifik, pergerakan kompetitor, dan tren sektor.",
    "Global Correspondent": "Fokus pada berita internasional dengan dampak regional, terutama dari pusat keuangan utama.",
    "Tech & Innovation": "Fokus pada perkembangan teknologi, transformasi digital, dan berita inovasi.",
  };

  return `${profile.councilSystemPrompt || `Anda mencari berita untuk ${profile.personaSummary || "seorang eksekutif Indonesia"}`}

${INDONESIAN_FIRST_SEARCH_PROMPT}

${TRUST_REQUIREMENTS}

---

TANGGAL HARI INI: ${today}
PERSPEKTIF ANDA: ${perspective}
${perspectiveInstructions[perspective] || ""}

TUGAS ANDA:
Cari 3-5 berita PALING RELEVAN untuk pengguna ini dari 24-48 jam terakhir.

Prioritas mereka:
${profile.primaryTopics ? JSON.stringify(profile.primaryTopics, null, 2) : "- Berita bisnis dan industri umum"}

Entitas yang dipantau:
${profile.entitiesToTrack?.join(", ") || "Pemain industri utama dan regulator"}

ATURAN KUALITAS:
- Hanya sertakan berita yang Anda yakin NYATA dan terbaru
- Prioritaskan intelijen yang actionable
- Lebih baik 2-3 item berkualitas tinggi daripada 5 yang meragukan
- Tanyakan: Apakah ini membantu mereka membuat keputusan?

HINDARI:
${profile.avoidTopics?.length ? profile.avoidTopics.map((t) => `- ${t}`).join("\n") : "- Konten sensasional atau tidak terverifikasi"}

UNTUK SETIAP ARTIKEL, respond dalam JSON:
{
  "searchQueries": ["query yang Anda gunakan"],
  "articles": [
    {
      "title": "Judul artikel (dalam bahasa asli)",
      "summary": "Ringkasan 2-3 kalimat dalam Bahasa Indonesia",
      "source": "Nama sumber (contoh: Kontan, Bloomberg)",
      "sourceType": "local" | "regional" | "global",
      "url": "URL lengkap jika tahu, atau 'perlu verifikasi'",
      "isPaywalled": true | false,
      "relevanceReason": "Mengapa ini penting untuk pengguna INI",
      "publishedDate": "${today}",
      "confidence": 8
    }
  ]
}

PENTING:
- Prioritaskan sumber Indonesia!
- Jika sumber berbayar (paywall), tetap sertakan dengan isPaywalled: true
- sourceType: "local" untuk Indonesia, "regional" untuk ASEAN, "global" untuk internasional`;
}

async function searchWithPerspective(
  profile: UserProfile,
  perspective: string
): Promise<CouncilMemberResponse> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: createSearchPrompt(profile, perspective) + "\n\nRespond ONLY with valid JSON.",
        },
      ],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const normalizedArticles = (parsed.articles || []).map((a: any) => ({
      ...a,
      sourceType: a.sourceType || "local",
      isPaywalled: a.isPaywalled ?? false,
    }));

    return {
      perspective,
      articles: normalizedArticles,
      searchQueries: parsed.searchQueries || [],
    };
  } catch (error: any) {
    console.error(`${perspective} error:`, error.message);
    return {
      perspective,
      articles: [],
      searchQueries: [],
      error: error.message,
    };
  }
}

async function claudeJudge(
  profile: UserProfile,
  allArticles: Array<FoundArticle & { foundBy: string }>,
  councilResults: CouncilMemberResponse[]
): Promise<DailyBriefContent> {
  const today = new Date().toISOString().split("T")[0];

  const judgePrompt = `Anda adalah HAKIM AKHIR dalam AI Council Kurasi.ai untuk kurasi berita.

PROFIL PENGGUNA:
${profile.councilSystemPrompt || profile.personaSummary || "Eksekutif Indonesia"}

KRITERIA SUKSES (dari pengguna):
"${profile.successDefinition || "Menerima intelijen yang actionable untuk membuat keputusan lebih baik"}"

KONTEKS KEPUTUSAN:
${profile.decisionContext || "Keputusan bisnis strategis"}

---

HASIL COUNCIL:
${councilResults.length} perspektif AI telah mencari berita. Total ${allArticles.length} artikel ditemukan:

${JSON.stringify(allArticles, null, 2)}

---

TUGAS HAKIM ANDA:

1. DEDUPLIKASI: Hapus berita yang sama dari perspektif berbeda, catat kesepakatan

2. VERIFIKASI TERHADAP KEBUTUHAN PENGGUNA: Untuk setiap artikel, tanyakan:
   - Apakah ini sesuai dengan kebutuhan pengguna ini?
   - Apakah ini membantu mereka mencapai kriteria sukses?
   - Apakah ini dari sumber kredibel?

3. VALIDASI SILANG:
   - Ditemukan oleh 2+ perspektif = Kepercayaan lebih tinggi
   - Ditemukan oleh 1 perspektif dengan skor rendah = Lebih skeptis

4. KATEGORIKAN:
   - KRITIS (1-3): Perlu tindakan segera, dampak langsung pada pekerjaan hari ini
   - PENTING (3-5): Perlu diketahui, mungkin mempengaruhi keputusan minggu ini
   - LATAR (2-4): Konteks baik, pantau perkembangan

5. PERSONALISASI: Tulis "Mengapa ini penting" yang SPESIFIK untuk peran pengguna INI

OUTPUT dalam Bahasa Indonesia:
{
  "briefDate": "${today}",
  "recipientName": "${profile.personaSummary?.split(".")[0] || "Eksekutif"}",
  "greeting": "Selamat pagi yang personal untuk pengguna ini",
  "executiveSummary": "2-3 kalimat ringkasan apa yang penting HARI INI untuk orang ini",
  "critical": [
    {
      "title": "...",
      "summary": "...",
      "source": "...",
      "sourceType": "local|regional|global",
      "url": "...",
      "isPaywalled": true/false,
      "whyItMatters": "Spesifik untuk pengguna INI...",
      "foundByPerspectives": ["daftar", "perspektif"],
      "verificationScore": 9
    }
  ],
  "important": [...],
  "background": [...],
  "councilAgreement": "Seberapa banyak perspektif setuju? Ada insight notable?",
  "confidenceNote": "Kepercayaan keseluruhan pada brief hari ini"
}

Respond HANYA dengan valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";
    const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("Claude Judge error:", error);
    throw error;
  }
}

export async function runCouncilForUser(userId: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  councilResults?: CouncilMemberResponse[];
  finalBrief?: DailyBriefContent;
  error?: string;
}> {
  console.log(`\n🏛️ Starting LLM Council for user ${userId}...`);

  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      success: false,
      error: "User profile not found. Complete onboarding first.",
    };
  }

  console.log(`👤 User: ${profile.personaSummary?.split(".")[0] || userId}`);
  console.log(`📋 Using personalized system prompt (${profile.councilSystemPrompt?.length || 0} chars)`);

  const perspectives = [
    "Market Analyst",
    "Regulatory Expert",
    "Industry Insider",
    "Global Correspondent",
    "Tech & Innovation",
  ];

  console.log("\n📡 Dispatching to council perspectives...");
  const startTime = Date.now();

  const councilResults = await Promise.all(
    perspectives.map((perspective) => searchWithPerspective(profile, perspective))
  );

  councilResults.forEach((result) => {
    const status = result.error ? "❌" : "✅";
    console.log(
      `${status} ${result.perspective}: ${result.articles.length} articles ${
        result.error ? `(${result.error})` : ""
      }`
    );
  });

  const allArticles = councilResults.flatMap((r) =>
    r.articles.map((a) => ({ ...a, foundBy: r.perspective }))
  );

  console.log(`\n📚 Total articles: ${allArticles.length}`);

  if (allArticles.length === 0) {
    const fallbackBrief: DailyBriefContent = {
      briefDate: new Date().toISOString().split("T")[0],
      recipientName: profile.personaSummary?.split(".")[0] || "Executive",
      greeting: profile.languagePreference === "id" ? "Selamat pagi!" : "Good morning!",
      executiveSummary:
        profile.languagePreference === "id"
          ? "Hari ini tidak ada berita kritis yang memerlukan perhatian segera. Pantau perkembangan terbaru."
          : "No critical news requiring immediate attention today. Continue monitoring developments.",
      critical: [],
      important: [],
      background: [],
      councilAgreement: "Council found no significant news matching your profile today.",
      confidenceNote: "Low volume day - all perspectives returned minimal results.",
    };

    await db.insert(dailyBriefs).values({
      userId,
      content: fallbackBrief,
      councilMetadata: { councilResults, generationTime: Date.now() - startTime },
    });

    return {
      success: true,
      profile,
      councilResults,
      finalBrief: fallbackBrief,
    };
  }

  console.log("⚖️ Claude Judge evaluating...");

  const finalBrief = await claudeJudge(profile, allArticles, councilResults);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️ Council completed in ${duration}s`);

  await db.insert(dailyBriefs).values({
    userId,
    content: finalBrief,
    councilMetadata: {
      councilResults: councilResults.map((r) => ({
        perspective: r.perspective,
        articlesFound: r.articles.length,
        error: r.error,
      })),
      generationTime: parseFloat(duration),
    },
  });

  return {
    success: true,
    profile,
    councilResults,
    finalBrief,
  };
}

export async function getTodaysBrief(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

export { getUserProfile, UserProfile, CouncilMemberResponse };
