import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { userProfiles, dailyBriefs, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

interface FoundArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
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
  url: string;
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
  const language = profile.languagePreference === "id" ? "Indonesian" : "English";

  const perspectiveInstructions: Record<string, string> = {
    "Market Analyst": "Focus on market trends, financial news, and economic indicators that affect business decisions.",
    "Regulatory Expert": "Focus on policy changes, regulatory updates, and compliance-related news from government bodies.",
    "Industry Insider": "Focus on industry-specific news, competitor moves, and sector trends.",
    "Global Correspondent": "Focus on international news with regional impact, especially from major financial centers.",
    "Tech & Innovation": "Focus on technology developments, digital transformation, and innovation news.",
  };

  return `${profile.councilSystemPrompt || `You are researching news for ${profile.personaSummary || "an executive"}`}

---

TODAY'S DATE: ${today}
YOUR PERSPECTIVE: ${perspective}
${perspectiveInstructions[perspective] || ""}

YOUR TASK:
Find 3-5 HIGHLY RELEVANT news items from the past 24-48 hours that match this user's intelligence needs.

Consider their priorities:
${profile.primaryTopics ? JSON.stringify(profile.primaryTopics, null, 2) : "- General business and industry news"}

Track these entities:
${profile.entitiesToTrack?.join(", ") || "Key industry players and regulators"}

QUALITY RULES:
- Only include news you're confident is REAL and recent
- Prioritize actionable intelligence
- Better to return 2-3 high-quality items than 5 questionable ones
- Consider: Would this help them make a decision?

AVOID:
${profile.avoidTopics?.length ? profile.avoidTopics.map((t) => `- ${t}`).join("\n") : "- Sensational or unverified content"}

Respond in JSON format:
{
  "searchQueries": ["what you conceptually searched for"],
  "articles": [
    {
      "title": "Article title",
      "summary": "2-3 sentence summary in ${language}",
      "source": "Source name (e.g., Bloomberg, Reuters, Kontan)",
      "url": "https://example.com/article or 'search required'",
      "relevanceReason": "Why this matters to this user specifically...",
      "publishedDate": "${today}",
      "confidence": 8
    }
  ]
}`;
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

    return {
      perspective,
      articles: parsed.articles || [],
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
  const language = profile.languagePreference === "id" ? "Indonesian" : "English";
  const today = new Date().toISOString().split("T")[0];

  const judgePrompt = `You are the FINAL JUDGE in an AI Council for news curation.

USER PROFILE:
${profile.councilSystemPrompt || profile.personaSummary || "Executive user"}

SUCCESS CRITERIA (from user):
"${profile.successDefinition || "Receive actionable intelligence that helps make better decisions"}"

DECISION CONTEXT:
${profile.decisionContext || "Strategic business decisions"}

---

COUNCIL RESULTS:
Multiple AI perspectives searched for news. Here are their combined ${allArticles.length} findings:

${JSON.stringify(
  allArticles.map((a) => ({
    ...a,
    foundBy: a.foundBy,
  })),
  null,
  2
)}

---

YOUR JUDGE TASKS:

1. **DEDUPLICATE**: Same story from different perspectives = keep one, note agreement

2. **VERIFY AGAINST USER NEEDS**: For each article, ask:
   - Does this match what this user needs?
   - Would this help them achieve their success criteria?
   - Is this from a credible source?

3. **CROSS-VALIDATE**: 
   - Found by 2+ perspectives = Higher confidence
   - Found by 1 perspective with low score = More skeptical

4. **CATEGORIZE**:
   - CRITICAL: Directly affects their work, needs attention today
   - IMPORTANT: Should know, might affect decisions this week
   - BACKGROUND: Good context, monitor for later

5. **PERSONALIZE**: Write "Why This Matters" that references THEIR specific role

OUTPUT (in ${language}):
{
  "briefDate": "${today}",
  "recipientName": "${profile.personaSummary?.split(".")[0] || "Executive"}",
  "greeting": "Personalized ${language} greeting for the morning",
  "executiveSummary": "2-3 sentences summarizing what matters TODAY for this person",
  "critical": [
    {
      "title": "...",
      "summary": "...",
      "source": "...",
      "url": "...",
      "whyItMatters": "Specifically for THIS user...",
      "foundByPerspectives": ["list", "of", "perspectives"],
      "verificationScore": 9
    }
  ],
  "important": [...],
  "background": [...],
  "councilAgreement": "How much did the perspectives agree? Any notable insights?",
  "confidenceNote": "Overall confidence in today's brief"
}

Respond ONLY with valid JSON.`;

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
