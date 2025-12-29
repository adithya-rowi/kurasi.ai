import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic();

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    })
  : null;

const ONBOARDING_PROMPT = `Anda adalah Loper, asisten yang membangun profil pengguna untuk brief berita personal.

TUJUAN: Buat pengguna NYAMAN BERCERITA tentang diri mereka. Semakin banyak mereka cerita, semakin bagus brief-nya.

GAYA BICARA:
- Hangat seperti teman yang curious
- Gunakan "Anda" bukan "kamu"
- React terhadap jawaban mereka (tunjukkan Anda mendengar!)
- Satu pertanyaan per giliran
- Follow-up yang natural dari jawaban mereka

ALUR PERTANYAAN (fleksibel, ikuti flow percakapan):

1. SUDAH DITANYAKAN: "Ceritakan tentang diri Anda - peran dan fokus utama"
   → Dengarkan, react, lalu tanyakan lebih dalam

2. KEBIASAAN BACA:
   "Oh menarik! Ngomong-ngomong, **sumber berita atau website apa yang biasa Anda baca** setiap hari? Yang Anda percaya untuk dapat informasi?"
   
3. TOPIK SPESIFIK:
   "Dari yang Anda sebutkan, **topik atau isu spesifik apa** yang kalau ada update, Anda harus tahu segera? Yang bisa mempengaruhi keputusan Anda?"

4. ORANG/PERUSAHAAN YANG DIIKUTI:
   "Ada **nama-nama spesifik** yang perlu saya pantau? Bisa tokoh, perusahaan, kompetitor, atau regulator tertentu..."

5. KEPUTUSAN SAAT INI (PALING PENTING!):
   "Ini penting nih - **keputusan atau project apa** yang sedang Anda kerjakan saat ini? Supaya saya bisa prioritaskan berita yang relevan untuk itu."

6. CLOSING:
   Setelah dapat cukup info (minimal jawab 4 pertanyaan), rangkum dan tutup:
   
   "Oke, saya sudah cukup mengenal Anda!
   
   [Rangkum 3-4 poin kunci tentang mereka]
   
   Brief pertama Anda akan saya siapkan. Saya akan fokuskan pada [topik mereka] dari [sumber mereka].
   
   Silakan buat akun untuk menerima brief-nya.
   
   [ONBOARDING_COMPLETE]"

TIPS BUAT MEREKA BICARA:
- Kalau jawaban singkat, tanya "Bisa ceritakan lebih detail?"
- Kalau mereka mention sesuatu menarik, follow up!
- Validasi jawaban mereka: "Wah, itu area yang dinamis ya..."
- Jangan interogasi - ini ngobrol santai tapi bermakna

JANGAN:
- Jangan tanya lebih dari 6 pertanyaan
- Jangan skip langkah
- Jangan terdengar seperti robot/form
- Jangan tutup sebelum dapat info tentang: role, sumber bacaan, topik spesifik, dan keputusan saat ini

CONTOH REACT YANG BAIK:
User: "Saya di fintech, ngurusin compliance"
Loper: "Oh compliance di fintech - pasti regulasi OJK dan BI jadi makanan sehari-hari ya! Nah, **sumber berita apa** yang biasa Anda andalkan untuk update regulasi?"`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function handleOnboardingChat(
  message: string,
  history: Message[]
): Promise<{ response: string; onboardingComplete: boolean; profileData?: any }> {
  try {
    const messages = history
      .filter((m) => m.role !== "system" as any)
      .concat([{ role: "user" as const, content: message }])
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let response: string;

    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: ONBOARDING_PROMPT,
      messages,
    });
    response = result.content[0].type === "text" ? result.content[0].text : "";

    const isComplete = response.includes("[ONBOARDING_COMPLETE]");
    const cleanResponse = response.replace("[ONBOARDING_COMPLETE]", "").trim();

    if (isComplete) {
      const fullHistory = [
        ...history,
        { role: "user" as const, content: message },
        { role: "assistant" as const, content: cleanResponse },
      ];

      const profileData = await extractProfileFromConversation(fullHistory);

      return {
        response: cleanResponse,
        onboardingComplete: true,
        profileData,
      };
    }

    return {
      response: cleanResponse,
      onboardingComplete: false,
    };
  } catch (error: any) {
    console.error("Onboarding chat error:", error);
    throw error;
  }
}

export async function extractProfileFromConversation(
  history: Message[]
): Promise<any> {
  const conversation = history
    .map((m) => `${m.role === "user" ? "USER" : "KURASI"}: ${m.content}`)
    .join("\n\n");

  const extractPrompt = `Dari percakapan ini, ekstrak profil pengguna untuk brief berita personal.

PERCAKAPAN:
${conversation}

---

Buat JSON dengan format ini. ISI SEDETAIL MUNGKIN dari percakapan:

{
  "name": "nama jika disebutkan, atau null",
  "role": "jabatan/peran lengkap",
  "organization": "perusahaan/organisasi jika disebutkan",
  "industry": "industri/sektor",
  
  "readingSources": ["sumber berita yang mereka baca/percaya"],
  "primaryTopics": ["topik utama yang HARUS dipantau"],
  "specificEntities": ["nama orang/perusahaan/regulasi spesifik"],
  "currentDecisions": "keputusan/project yang sedang dikerjakan",
  
  "councilSystemPrompt": "Tulis system prompt 400-600 kata yang SANGAT SPESIFIK untuk 6 AI Council. 

Harus mencakup:
1. Siapa pengguna ini (role, context)
2. Sumber yang mereka percaya (PRIORITASKAN ini dalam pencarian)
3. Topik spesifik yang harus dicari
4. Entity/nama yang harus di-track
5. Keputusan apa yang sedang mereka hadapi (ini menentukan apa yang RELEVAN)
6. Definisi berita yang 'actionable' untuk orang INI

Tulis seolah memberi brief ke tim research: 'Cari berita untuk [orang ini] yang sedang [melakukan X]. Fokuskan pada [topik]. Pantau [entity]. Prioritaskan sumber [X, Y, Z]. Berita relevan adalah yang membantu mereka [keputusan].'"
}

Respond dengan valid JSON saja.`;

  try {
    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: extractPrompt }],
    });

    const content =
      result.content[0].type === "text" ? result.content[0].text : "{}";
    return JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
  } catch (error: any) {
    console.error("Profile extraction error:", error);
    return {
      role: "Unknown",
      primaryTopics: [],
      councilSystemPrompt: "Cari berita bisnis Indonesia yang relevan untuk eksekutif.",
    };
  }
}
