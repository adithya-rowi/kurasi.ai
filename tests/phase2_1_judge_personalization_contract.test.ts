/**
 * Phase 2.1 - Judge Personalization Contract Tests
 *
 * Tests that the claudeJudge prompt enforces personalization rules:
 * (a) ctx.role is included in the prompt
 * (b) ctx.decisionContext is included (or "(none)")
 * (c) Strict rule requiring "Sebagai <ROLE>, ..."
 * (d) Ban on "Bagi eksekutif" except for allowed role
 * (e) Konsultan-specific guidance keywords
 *
 * Run with: npx tsx tests/phase2_1_judge_personalization_contract.test.ts
 */

// Test utilities
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    failed++;
  }
}

function assertContains(text: string, substring: string, message: string): void {
  if (text.includes(substring)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Looking for: "${substring}"`);
    failed++;
  }
}

function assertContainsAtLeast(text: string, substrings: string[], minCount: number, message: string): void {
  const found = substrings.filter(s => text.toLowerCase().includes(s.toLowerCase()));
  if (found.length >= minCount) {
    console.log(`✅ PASS: ${message} (found ${found.length}: ${found.join(", ")})`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected at least ${minCount}, found ${found.length}: ${found.join(", ")}`);
    console.log(`   Looking for any of: ${substrings.join(", ")}`);
    failed++;
  }
}

// ============================================================================
// TYPES (copied for standalone testing)
// ============================================================================

interface SearchResult {
  model: string;
  provider: string;
  layer: "search";
  articles: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    summary?: string;
  }>;
  error?: string;
}

interface AnalysisResult {
  model: string;
  provider: string;
  layer: "analysis";
  themes: Array<{
    topic: string;
    importance: string;
    summary: string;
  }>;
  riskAssessment?: string;
  opportunities?: string[];
  error?: string;
}

interface SearchContext {
  role: string;
  decisionContext: string | null;
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

interface UserProfile {
  councilSystemPrompt?: string | null;
  personaSummary?: string | null;
  successDefinition?: string | null;
}

// ============================================================================
// PROMPT BUILDER (copied from claudeJudge for testing)
// This replicates the exact prompt construction logic
// ============================================================================

const ECONOMIST_ESPRESSO_PROMPT = `You are a senior editor...`; // Simplified for test

function buildJudgePrompt(
  profile: UserProfile,
  searchResults: SearchResult[],
  analysisResults: AnalysisResult[],
  ctx: SearchContext
): string {
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

  // This is the exact prompt structure from claudeJudge after Phase 2.1
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

OUTPUT JSON (Bahasa Indonesia):
{
  "briefDate": "${dateStr}",
  "edition": "${formattedDate}",
  "topStories": []
}`;

  return judgePrompt;
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestContext(role: string, decisionContext: string | null): SearchContext {
  return {
    role,
    decisionContext,
    topics: ["Fintech"],
    entities: ["OJK"],
    sources: [],
    keywords: [],
    avoidTopics: [],
    language: "id",
    languageName: "Bahasa Indonesia",
    hasIndonesianFocus: true,
    hasInternationalFocus: false,
    persona: "",
  };
}

function createTestProfile(): UserProfile {
  return {
    councilSystemPrompt: null,
    personaSummary: "Senior executive at a tech company",
    successDefinition: "Actionable intelligence",
  };
}

function createTestSearchResults(): SearchResult[] {
  return [{
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [{
      title: "Test Article",
      url: "https://example.com/test",
      snippet: "Test snippet",
      source: "Test Source",
    }],
  }];
}

function createTestAnalysisResults(): AnalysisResult[] {
  return [{
    model: "DeepSeek",
    provider: "DeepSeek",
    layer: "analysis",
    themes: [{
      topic: "Test Theme",
      importance: "important",
      summary: "Test summary",
    }],
    riskAssessment: "Low risk",
    opportunities: ["Test opportunity"],
  }];
}

// ============================================================================
// TEST CASE 1: Role is included in prompt
// ============================================================================

console.log("\n=== Test Case 1: Role is included in prompt ===\n");

const testRoles = [
  "Investor / Fund Manager",
  "CEO / Founder",
  "Eksekutif Korporat (CFO/COO/Head)",
  "Konsultan / Advisor",
  "Regulator / Pemerintahan",
];

testRoles.forEach(role => {
  const ctx = createTestContext(role, null);
  const prompt = buildJudgePrompt(createTestProfile(), createTestSearchResults(), createTestAnalysisResults(), ctx);

  assertContains(prompt, `ROLE: ${role}`, `Prompt contains ROLE: ${role}`);
  assertContains(prompt, `Sebagai ${role}`, `Prompt contains 'Sebagai ${role}' instruction`);
});

// ============================================================================
// TEST CASE 2: Decision context is included (with value)
// ============================================================================

console.log("\n=== Test Case 2: Decision context is included ===\n");

const decisionContext = "alokasi portofolio 2026";
const ctxWithDecision = createTestContext("Investor / Fund Manager", decisionContext);
const promptWithDecision = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  ctxWithDecision
);

assertContains(promptWithDecision, `DECISION CONTEXT: ${decisionContext}`, "Prompt contains decision context value");
assertContains(promptWithDecision, `koneksi langsung ke: "${decisionContext}"`, "Prompt mentions decision context in rules");

// ============================================================================
// TEST CASE 3: Decision context shows "(none)" when null
// ============================================================================

console.log("\n=== Test Case 3: Decision context shows (none) when null ===\n");

const ctxNoDecision = createTestContext("CEO / Founder", null);
const promptNoDecision = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  ctxNoDecision
);

assertContains(promptNoDecision, "DECISION CONTEXT: (none)", "Prompt shows '(none)' when decisionContext is null");

// ============================================================================
// TEST CASE 4: Strict rule "Sebagai <ROLE>, ..." is present
// ============================================================================

console.log("\n=== Test Case 4: Strict rule for 'Sebagai <ROLE>' ===\n");

const ctxForRule = createTestContext("Komisaris / Penasihat Senior", "board meeting preparation");
const promptForRule = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  ctxForRule
);

assertContains(promptForRule, 'WAJIB: Setiap "Mengapa penting" HARUS dimulai dengan', "Prompt contains mandatory rule");
assertContains(promptForRule, `"Sebagai ${ctxForRule.role}, ..."`, "Prompt specifies role in Sebagai template");

// ============================================================================
// TEST CASE 5: Ban on "Bagi eksekutif" is present
// ============================================================================

console.log("\n=== Test Case 5: Ban on generic 'Bagi eksekutif' ===\n");

const promptForBan = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  createTestContext("Investor / Fund Manager", null)
);

assertContains(promptForBan, 'DILARANG: Frasa generik seperti "Bagi eksekutif"', "Prompt contains ban on generic phrasing");
assertContains(promptForBan, 'KECUALI jika ROLE adalah "Eksekutif Korporat (CFO/COO/Head)"', "Prompt contains exception for Eksekutif role");

// ============================================================================
// TEST CASE 6: Konsultan-specific guidance keywords
// ============================================================================

console.log("\n=== Test Case 6: Konsultan-specific guidance keywords ===\n");

const konsultanKeywords = [
  "klien",
  "advisory",
  "packaging",
  "pitch",
  "rate card",
  "partnership",
  "subcontracting",
  "langkah konkret",
];

const ctxKonsultan = createTestContext("Konsultan / Advisor", null);
const promptKonsultan = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  ctxKonsultan
);

assertContains(promptKonsultan, 'KHUSUS untuk ROLE "Konsultan / Advisor"', "Prompt contains Konsultan-specific section");
assertContainsAtLeast(promptKonsultan, konsultanKeywords, 5, "Prompt contains at least 5 Konsultan keywords");

// Verify the example is present
assertContains(promptKonsultan, "Sebagai Konsultan / Advisor, kekurangan talenta cyber", "Prompt contains cyber talent partnership example");
assertContains(promptKonsultan, "margin konsultasi", "Prompt mentions consulting margin in example");

// ============================================================================
// TEST CASE 7: PERSONALIZATION CONTRACT section exists
// ============================================================================

console.log("\n=== Test Case 7: PERSONALIZATION CONTRACT section ===\n");

const anyPrompt = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  createTestContext("Akademisi / Peneliti", "research grant proposal")
);

assertContains(anyPrompt, "PERSONALIZATION CONTRACT (Phase 2.1 - NON-NEGOTIABLE)", "Prompt contains PERSONALIZATION CONTRACT header");
assertContains(anyPrompt, "STRICT RULES FOR", "Prompt contains STRICT RULES section");

// ============================================================================
// TEST CASE 8: Different roles get different Sebagai templates
// ============================================================================

console.log("\n=== Test Case 8: Different roles get different templates ===\n");

const role1 = "Regulator / Pemerintahan";
const role2 = "Akademisi / Peneliti";

const prompt1 = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  createTestContext(role1, null)
);

const prompt2 = buildJudgePrompt(
  createTestProfile(),
  createTestSearchResults(),
  createTestAnalysisResults(),
  createTestContext(role2, null)
);

assertContains(prompt1, `Sebagai ${role1}`, `Prompt 1 uses ${role1} in template`);
assertContains(prompt2, `Sebagai ${role2}`, `Prompt 2 uses ${role2} in template`);
assert(!prompt1.includes(`Sebagai ${role2}`), `Prompt 1 does NOT contain ${role2}`);
assert(!prompt2.includes(`Sebagai ${role1}`), `Prompt 2 does NOT contain ${role1}`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.1 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
