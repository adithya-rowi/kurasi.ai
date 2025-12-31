/**
 * Phase 0.2 - Search Context Tests
 *
 * Tests that buildSearchContext passes through role and decisionContext exactly as provided.
 * This is a standalone test that doesn't require database connection.
 *
 * Run with: npx tsx tests/phase0_2_search_context.test.ts
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
// COPY OF TYPES AND FUNCTION FROM llmCouncilV2.ts FOR STANDALONE TESTING
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

// ============================================================================
// TEST: role is passed through exactly as provided
// ============================================================================

console.log("\n=== Testing role pass-through ===\n");

const testRoles = [
  "Investor / Fund Manager",
  "CEO / Founder",
  "Eksekutif Korporat (CFO/COO/Head)",
  "Komisaris / Penasihat Senior",
  "Konsultan / Advisor",
  "Regulator / Pemerintahan",
  "Akademisi / Peneliti",
  "Lainnya",
];

testRoles.forEach((role) => {
  const profile = createTestProfile({ role });
  const context = buildSearchContext(profile);
  assertEqual(context.role, role, `role "${role}" passed through exactly`);
});

// ============================================================================
// TEST: decisionContext is passed through exactly as provided
// ============================================================================

console.log("\n=== Testing decisionContext pass-through ===\n");

const testDecisionContext1 = "Evaluating potential acquisition targets in fintech sector";
const profile1 = createTestProfile({
  role: "CEO / Founder",
  decisionContext: testDecisionContext1,
});
const context1 = buildSearchContext(profile1);
assertEqual(
  context1.decisionContext,
  testDecisionContext1,
  "decisionContext string passed through exactly"
);

const testDecisionContext2 = "Preparing quarterly board presentation on market trends";
const profile2 = createTestProfile({
  role: "Komisaris / Penasihat Senior",
  decisionContext: testDecisionContext2,
});
const context2 = buildSearchContext(profile2);
assertEqual(
  context2.decisionContext,
  testDecisionContext2,
  "decisionContext different string passed through exactly"
);

// ============================================================================
// TEST: decisionContext may be null
// ============================================================================

console.log("\n=== Testing decisionContext null handling ===\n");

const profileWithNullContext = createTestProfile({
  role: "Investor / Fund Manager",
  decisionContext: null,
});
const contextWithNull = buildSearchContext(profileWithNullContext);
assertEqual(
  contextWithNull.decisionContext,
  null,
  "decisionContext null is preserved"
);

assert(
  contextWithNull.decisionContext === null,
  "decisionContext is exactly null (not undefined or empty string)"
);

// ============================================================================
// TEST: SearchContext type has correct fields
// ============================================================================

console.log("\n=== Testing SearchContext type structure ===\n");

const fullProfile = createTestProfile({
  role: "Eksekutif Korporat (CFO/COO/Head)",
  decisionContext: "Strategic planning for 2025",
});
const fullContext = buildSearchContext(fullProfile);

assert("role" in fullContext, "SearchContext has 'role' field");
assert("decisionContext" in fullContext, "SearchContext has 'decisionContext' field");
assert(typeof fullContext.role === "string", "role is a string");
assert(
  fullContext.decisionContext === null || typeof fullContext.decisionContext === "string",
  "decisionContext is string or null"
);

// ============================================================================
// TEST: No transformation occurs
// ============================================================================

console.log("\n=== Testing no transformation ===\n");

const specialRole = "Eksekutif Korporat (CFO/COO/Head)";
const specialContext = "Keputusan strategis: akuisisi & ekspansi ke pasar Asia-Pasifik";
const profileSpecial = createTestProfile({
  role: specialRole,
  decisionContext: specialContext,
});
const contextSpecial = buildSearchContext(profileSpecial);

assertEqual(contextSpecial.role, specialRole, "role with special chars preserved exactly");
assertEqual(
  contextSpecial.decisionContext,
  specialContext,
  "decisionContext with special chars preserved exactly"
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 0.2 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
