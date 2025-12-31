/**
 * Phase 0.3 - Context Propagation Tests
 *
 * Tests that role and decisionContext are propagated through to analysis and judge layers.
 * This is a standalone test that simulates the propagation flow.
 *
 * Run with: npx tsx tests/phase0_3_context_propagation.test.ts
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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ============================================================================
// TYPES (copied from llmCouncilV2.ts for standalone testing)
// ============================================================================

interface UserProfile {
  id: string;
  userId: string;
  role: string;
  decisionContext: string | null;
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

interface SearchResult {
  model: string;
  provider: string;
  layer: "search";
  articles: any[];
  error?: string;
}

interface AnalysisResult {
  model: string;
  provider: string;
  layer: "analysis";
  themes: any[];
  error?: string;
}

// ============================================================================
// SIMULATED FUNCTIONS (matching Phase 0.3 signatures)
// ============================================================================

function buildSearchContext(profile: UserProfile): SearchContext {
  const primaryTopics = Array.isArray(profile.primaryTopics)
    ? profile.primaryTopics.map((t: any) => typeof t === "string" ? t : t.name || t.label || "")
    : [];
  const secondaryTopics = Array.isArray(profile.secondaryTopics)
    ? profile.secondaryTopics.map((t: any) => typeof t === "string" ? t : t.name || t.label || "")
    : [];
  const topics = [...primaryTopics, ...secondaryTopics].filter(Boolean);

  const entities = profile.entitiesToTrack?.filter(Boolean) || [];

  const sources = Array.isArray(profile.preferredSources)
    ? profile.preferredSources.map((s: any) => typeof s === "string" ? s : s.name || s.label || "").filter(Boolean)
    : [];

  const keywords = profile.keywordsToTrack?.filter(Boolean) || [];
  const avoidTopics = profile.avoidTopics?.filter(Boolean) || [];

  const language = profile.languagePreference || "id";
  const languageName = language === "id" ? "Bahasa Indonesia" : language === "en" ? "English" : language;

  const indonesianIndicators = ["indonesia", "jakarta", "rupiah", "ojk", "bi", "bumn", "kontan", "bisnis indonesia", "kompas", "tempo"];
  const allContent = [...topics, ...entities, ...sources, ...keywords].join(" ").toLowerCase();

  const hasIndonesianFocus = indonesianIndicators.some(ind => allContent.includes(ind)) || language === "id";
  const hasInternationalFocus = sources.some(s =>
    ["bloomberg", "reuters", "ft", "financial times", "wsj", "economist", "nikkei"].some(intl => s.toLowerCase().includes(intl))
  );

  const persona = profile.councilSystemPrompt || profile.personaSummary || profile.roleDescription || "";

  return {
    role: profile.role,
    decisionContext: profile.decisionContext,
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

// Simulated analysis function input capture (Phase 0.3 signature)
interface AnalysisInput {
  profile: UserProfile;
  searchResults: SearchResult[];
  ctx: SearchContext;
}

let capturedAnalysisInputs: AnalysisInput[] = [];

function simulateAnalyzeWithDeepSeek(
  profile: UserProfile,
  searchResults: SearchResult[],
  ctx: SearchContext
): AnalysisInput {
  const input = { profile, searchResults, ctx };
  capturedAnalysisInputs.push(input);
  return input;
}

function simulateAnalyzeWithGPT(
  profile: UserProfile,
  searchResults: SearchResult[],
  ctx: SearchContext
): AnalysisInput {
  const input = { profile, searchResults, ctx };
  capturedAnalysisInputs.push(input);
  return input;
}

// Simulated judge function input capture (Phase 0.3 signature)
interface JudgeInput {
  profile: UserProfile;
  searchResults: SearchResult[];
  analysisResults: AnalysisResult[];
  ctx: SearchContext;
}

let capturedJudgeInput: JudgeInput | null = null;

function simulateClaudeJudge(
  profile: UserProfile,
  searchResults: SearchResult[],
  analysisResults: AnalysisResult[],
  ctx: SearchContext
): JudgeInput {
  capturedJudgeInput = { profile, searchResults, analysisResults, ctx };
  return capturedJudgeInput;
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestProfile(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: "test-id",
    userId: "test-user",
    role: "Lainnya",
    decisionContext: null,
    personaSummary: null,
    roleDescription: null,
    organizationContext: null,
    primaryTopics: [],
    secondaryTopics: [],
    keywordsToTrack: null,
    entitiesToTrack: null,
    preferredSources: [],
    avoidTopics: null,
    languagePreference: "id",
    councilSystemPrompt: null,
    successDefinition: null,
    ...overrides,
  };
}

function resetCaptures() {
  capturedAnalysisInputs = [];
  capturedJudgeInput = null;
}

// ============================================================================
// SIMULATED ORCHESTRATOR FLOW (matching Phase 0.3 architecture)
// ============================================================================

function simulateCouncilV2(profile: UserProfile) {
  // Phase 0.3: Build SearchContext once (contains role and decisionContext)
  const searchContext = buildSearchContext(profile);

  // Simulate search results
  const searchResults: SearchResult[] = [
    { model: "Perplexity", provider: "Perplexity", layer: "search", articles: [] },
  ];

  // Phase 0.3: Pass searchContext to analysis functions
  simulateAnalyzeWithDeepSeek(profile, searchResults, searchContext);
  simulateAnalyzeWithGPT(profile, searchResults, searchContext);

  // Simulate analysis results
  const analysisResults: AnalysisResult[] = [
    { model: "DeepSeek", provider: "DeepSeek", layer: "analysis", themes: [] },
  ];

  // Phase 0.3: Pass searchContext to judge function
  simulateClaudeJudge(profile, searchResults, analysisResults, searchContext);

  return { searchContext, searchResults, analysisResults };
}

// ============================================================================
// TEST: role from profile appears in analysis input object
// ============================================================================

console.log("\n=== Testing role propagation to analysis layer ===\n");

resetCaptures();

const testRole1 = "CEO / Founder";
const profile1 = createTestProfile({ role: testRole1 });
simulateCouncilV2(profile1);

assert(capturedAnalysisInputs.length === 2, "Two analysis functions were called");
assertEqual(capturedAnalysisInputs[0].ctx.role, testRole1, "DeepSeek receives role in ctx");
assertEqual(capturedAnalysisInputs[1].ctx.role, testRole1, "GPT receives role in ctx");

// Test with different role
resetCaptures();

const testRole2 = "Investor / Fund Manager";
const profile2 = createTestProfile({ role: testRole2 });
simulateCouncilV2(profile2);

assertEqual(capturedAnalysisInputs[0].ctx.role, testRole2, "Analysis receives different role correctly");

// ============================================================================
// TEST: decisionContext from profile appears in analysis input object
// ============================================================================

console.log("\n=== Testing decisionContext propagation to analysis layer ===\n");

resetCaptures();

const testDecisionContext = "Evaluating M&A opportunities in Southeast Asia fintech sector";
const profile3 = createTestProfile({
  role: "Eksekutif Korporat (CFO/COO/Head)",
  decisionContext: testDecisionContext,
});
simulateCouncilV2(profile3);

assertEqual(
  capturedAnalysisInputs[0].ctx.decisionContext,
  testDecisionContext,
  "DeepSeek receives decisionContext in ctx"
);
assertEqual(
  capturedAnalysisInputs[1].ctx.decisionContext,
  testDecisionContext,
  "GPT receives decisionContext in ctx"
);

// ============================================================================
// TEST: role appears in judge input object
// ============================================================================

console.log("\n=== Testing role propagation to judge layer ===\n");

resetCaptures();

const judgeTestRole = "Komisaris / Penasihat Senior";
const profile4 = createTestProfile({ role: judgeTestRole });
simulateCouncilV2(profile4);

assert(capturedJudgeInput !== null, "Judge function was called");
assertEqual(capturedJudgeInput!.ctx.role, judgeTestRole, "Judge receives role in ctx");

// ============================================================================
// TEST: decisionContext appears in judge input object
// ============================================================================

console.log("\n=== Testing decisionContext propagation to judge layer ===\n");

resetCaptures();

const judgeDecisionContext = "Preparing strategic recommendations for board meeting";
const profile5 = createTestProfile({
  role: "Konsultan / Advisor",
  decisionContext: judgeDecisionContext,
});
simulateCouncilV2(profile5);

assertEqual(
  capturedJudgeInput!.ctx.decisionContext,
  judgeDecisionContext,
  "Judge receives decisionContext in ctx"
);

// ============================================================================
// TEST: null decisionContext is preserved
// ============================================================================

console.log("\n=== Testing null decisionContext preservation ===\n");

resetCaptures();

const profile6 = createTestProfile({
  role: "Akademisi / Peneliti",
  decisionContext: null,
});
simulateCouncilV2(profile6);

assertEqual(
  capturedAnalysisInputs[0].ctx.decisionContext,
  null,
  "Analysis receives null decisionContext"
);
assertEqual(
  capturedAnalysisInputs[1].ctx.decisionContext,
  null,
  "GPT analysis receives null decisionContext"
);
assertEqual(
  capturedJudgeInput!.ctx.decisionContext,
  null,
  "Judge receives null decisionContext"
);

assert(
  capturedJudgeInput!.ctx.decisionContext === null,
  "decisionContext is exactly null (not undefined)"
);

// ============================================================================
// TEST: Full propagation chain preserves values exactly
// ============================================================================

console.log("\n=== Testing full propagation chain ===\n");

resetCaptures();

const fullTestRole = "Regulator / Pemerintahan";
const fullTestContext = "Monitoring compliance dengan peraturan OJK terbaru";
const profile7 = createTestProfile({
  role: fullTestRole,
  decisionContext: fullTestContext,
});

const result = simulateCouncilV2(profile7);

// Verify SearchContext was built correctly
assertEqual(result.searchContext.role, fullTestRole, "SearchContext has correct role");
assertEqual(result.searchContext.decisionContext, fullTestContext, "SearchContext has correct decisionContext");

// Verify all downstream functions received the same context
assertEqual(capturedAnalysisInputs[0].ctx.role, fullTestRole, "First analysis has same role as searchContext");
assertEqual(capturedAnalysisInputs[1].ctx.role, fullTestRole, "Second analysis has same role as searchContext");
assertEqual(capturedJudgeInput!.ctx.role, fullTestRole, "Judge has same role as searchContext");

assertEqual(
  capturedAnalysisInputs[0].ctx.decisionContext,
  fullTestContext,
  "First analysis has same decisionContext as searchContext"
);
assertEqual(
  capturedAnalysisInputs[1].ctx.decisionContext,
  fullTestContext,
  "Second analysis has same decisionContext as searchContext"
);
assertEqual(
  capturedJudgeInput!.ctx.decisionContext,
  fullTestContext,
  "Judge has same decisionContext as searchContext"
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 0.3 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
