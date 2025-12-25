import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { onboardingConversations, userProfiles, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const ONBOARDING_SYSTEM_PROMPT = `Anda adalah analis intelijen senior yang melakukan wawancara onboarding untuk CurateAI.

BAHASA: Selalu gunakan Bahasa Indonesia yang sopan dan profesional. Gunakan "Anda" bukan "kamu".

TUJUAN: Memahami pengguna dengan mendalam agar dapat mengurasi berita yang sempurna untuk mereka.

YANG PERLU DIPAHAMI:
1. Siapa mereka (jabatan, organisasi, latar belakang)
2. Topik utama yang harus dipantau
3. Topik sekunder yang menarik
4. Kata kunci spesifik (nama orang, perusahaan, regulasi)
5. Sumber yang dipercaya atau dihindari
6. Definisi sukses: berita seperti apa yang membuat mereka langsung bertindak?

GAYA WAWANCARA:
- Hangat, profesional, seperti rekan senior
- Satu pertanyaan fokus per giliran
- Dengarkan dengan seksama, ajukan follow-up yang relevan
- Jangan robotik - percakapan natural
- Target 5-8 pertukaran pesan

Ketika sudah cukup memahami pengguna, akhiri dengan:
[ONBOARDING_COMPLETE]

Ingat: Setiap eksekutif itu unik. Tugas Anda adalah menemukan apa yang membuat kebutuhan informasi orang INI istimewa.`;

const PROFILE_GENERATION_PROMPT = `Based on the following onboarding conversation, generate a comprehensive user profile for news curation.

CONVERSATION:
{conversation}

Generate a JSON object with these exact fields:
{
  "personaSummary": "2-3 sentences capturing who this executive is, their role, and what drives them",
  "roleDescription": "Their job title and key responsibilities",
  "organizationContext": "Their organization, industry, and competitive context",
  "primaryTopics": [
    {"name": "Topic name", "importance": 1-10, "reason": "Why this matters to them"}
  ],
  "secondaryTopics": [
    {"name": "Topic name", "importance": 1-10, "reason": "Why this matters"}
  ],
  "keywordsToTrack": ["keyword1", "keyword2", ...],
  "entitiesToTrack": ["Company X", "Person Y", "Regulation Z", ...],
  "preferredSources": [
    {"name": "Source name", "type": "publication|industry|region", "reason": "Why valuable"}
  ],
  "avoidTopics": ["topic to avoid", ...],
  "languagePreference": "id" or "en",
  "successDefinition": "What would make this service invaluable to them",
  "decisionContext": "What decisions do they make that require intelligence",
  "councilSystemPrompt": "A 500-1000 word prompt for an AI news curator that captures EVERYTHING needed to curate perfect news for this specific user. Include their role, priorities, what they care about, how they think, what would surprise and delight them, what to avoid, and how to judge relevance. Write it as if briefing a brilliant analyst who will curate their daily intelligence."
}

Ensure the councilSystemPrompt is extremely detailed and personalized - it's the core asset for future AI curation.`;

export interface OnboardingChatResult {
  message: string;
  isComplete: boolean;
  profileGenerated?: boolean;
}

export async function getOrCreateOnboardingConversation(userId: string) {
  const [existing] = await db
    .select()
    .from(onboardingConversations)
    .where(eq(onboardingConversations.userId, userId));

  if (existing) {
    return existing;
  }

  const [newConvo] = await db
    .insert(onboardingConversations)
    .values({ userId, messages: [] })
    .returning();

  return newConvo;
}

export async function processOnboardingMessage(
  userId: string,
  userMessage: string
): Promise<OnboardingChatResult> {
  const conversation = await getOrCreateOnboardingConversation(userId);
  const existingMessages = (conversation.messages as ConversationMessage[]) || [];

  const updatedMessages: ConversationMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: ONBOARDING_SYSTEM_PROMPT,
    messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  const finalMessages: ConversationMessage[] = [
    ...updatedMessages,
    { role: "assistant", content: assistantMessage },
  ];

  await db
    .update(onboardingConversations)
    .set({ messages: finalMessages })
    .where(eq(onboardingConversations.userId, userId));

  const exchangeCount = finalMessages.filter((m) => m.role === "user").length;
  const shouldComplete = exchangeCount >= 5 && (
    assistantMessage.toLowerCase().includes("profile") ||
    assistantMessage.toLowerCase().includes("ready to") ||
    assistantMessage.toLowerCase().includes("everything i need") ||
    assistantMessage.toLowerCase().includes("get started") ||
    exchangeCount >= 8
  );

  return {
    message: assistantMessage,
    isComplete: shouldComplete,
  };
}

export async function startOnboardingConversation(userId: string): Promise<string> {
  const conversation = await getOrCreateOnboardingConversation(userId);
  const existingMessages = (conversation.messages as ConversationMessage[]) || [];

  if (existingMessages.length > 0) {
    const lastAssistant = existingMessages
      .filter((m) => m.role === "assistant")
      .pop();
    return lastAssistant?.content || "Selamat datang kembali! Mari kita lanjutkan percakapan kita.";
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: ONBOARDING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: "Start the onboarding conversation." }],
  });

  const welcomeMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  await db
    .update(onboardingConversations)
    .set({ messages: [{ role: "assistant", content: welcomeMessage }] })
    .where(eq(onboardingConversations.userId, userId));

  return welcomeMessage;
}

export async function generateUserProfile(userId: string): Promise<boolean> {
  const conversation = await getOrCreateOnboardingConversation(userId);
  const messages = (conversation.messages as ConversationMessage[]) || [];

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = PROFILE_GENERATION_PROMPT.replace("{conversation}", conversationText);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from profile generation response");
    return false;
  }

  try {
    const profile = JSON.parse(jsonMatch[0]);

    const [existing] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (existing) {
      await db
        .update(userProfiles)
        .set({
          personaSummary: profile.personaSummary,
          roleDescription: profile.roleDescription,
          organizationContext: profile.organizationContext,
          primaryTopics: profile.primaryTopics,
          secondaryTopics: profile.secondaryTopics,
          keywordsToTrack: profile.keywordsToTrack,
          entitiesToTrack: profile.entitiesToTrack,
          preferredSources: profile.preferredSources,
          avoidTopics: profile.avoidTopics,
          languagePreference: profile.languagePreference,
          councilSystemPrompt: profile.councilSystemPrompt,
          successDefinition: profile.successDefinition,
          decisionContext: profile.decisionContext,
          lastUpdated: new Date(),
          version: existing.version + 1,
        })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles).values({
        userId,
        personaSummary: profile.personaSummary,
        roleDescription: profile.roleDescription,
        organizationContext: profile.organizationContext,
        primaryTopics: profile.primaryTopics,
        secondaryTopics: profile.secondaryTopics,
        keywordsToTrack: profile.keywordsToTrack,
        entitiesToTrack: profile.entitiesToTrack,
        preferredSources: profile.preferredSources,
        avoidTopics: profile.avoidTopics,
        languagePreference: profile.languagePreference,
        councilSystemPrompt: profile.councilSystemPrompt,
        successDefinition: profile.successDefinition,
        decisionContext: profile.decisionContext,
      });
    }

    await db
      .update(onboardingConversations)
      .set({ isComplete: true, completedAt: new Date() })
      .where(eq(onboardingConversations.userId, userId));

    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error("Failed to parse profile JSON:", error);
    return false;
  }
}

export async function streamOnboardingMessage(
  userId: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
  onComplete: (result: OnboardingChatResult) => void
): Promise<void> {
  const conversation = await getOrCreateOnboardingConversation(userId);
  const existingMessages = (conversation.messages as ConversationMessage[]) || [];

  const updatedMessages: ConversationMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: ONBOARDING_SYSTEM_PROMPT,
    messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const text = event.delta.text;
      if (text) {
        fullResponse += text;
        onChunk(text);
      }
    }
  }

  const finalMessages: ConversationMessage[] = [
    ...updatedMessages,
    { role: "assistant", content: fullResponse },
  ];

  await db
    .update(onboardingConversations)
    .set({ messages: finalMessages })
    .where(eq(onboardingConversations.userId, userId));

  const exchangeCount = finalMessages.filter((m) => m.role === "user").length;
  const shouldComplete = exchangeCount >= 5 && (
    fullResponse.toLowerCase().includes("profile") ||
    fullResponse.toLowerCase().includes("ready to") ||
    fullResponse.toLowerCase().includes("everything i need") ||
    fullResponse.toLowerCase().includes("get started") ||
    exchangeCount >= 8
  );

  onComplete({
    message: fullResponse,
    isComplete: shouldComplete,
  });
}
