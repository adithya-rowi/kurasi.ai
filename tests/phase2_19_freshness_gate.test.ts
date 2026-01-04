/**
 * Phase 2.19-B - Freshness Gate for topStories
 *
 * Tests that topStories are filtered to only include news from the last 24 hours.
 * Stories with missing, invalid, or stale dates are dropped.
 * If fewer than 2 stories remain, quiet day acknowledgment is added.
 *
 * Run with: npx tsx tests/phase2_19_freshness_gate.test.ts
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
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
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
// COPIED FROM llmCouncilV2.ts for standalone testing
// ============================================================================

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
  recencyLabel?: string;
  publishedDate?: string;
}

interface EspressoBrief {
  briefDate: string;
  edition: string;
  recipientName: string;
  greeting: string;
  executiveThesis?: string;
  theWorldInBrief: string;
  topStories: EspressoStory[];
  tokohInsights?: EspressoStory[];
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

/**
 * Phase 2.19-B: Enforce 24h freshness for topStories with graceful degradation.
 * Copied from llmCouncilV2.ts for standalone testing.
 */
function enforceFreshTopStories(
  brief: EspressoBrief,
  now: Date,
  freshnessHours: number = 24
): EspressoBrief {
  const parseStoryDate = (d?: string): Date | null => {
    if (!d || !d.trim()) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const isFresh = (d?: string): boolean => {
    const dt = parseStoryDate(d);
    if (!dt) return false;
    const hoursAgo = (now.getTime() - dt.getTime()) / (1000 * 60 * 60);
    return hoursAgo >= 0 && hoursAgo <= freshnessHours;
  };

  // Phase 2.19: Freshness gate with graceful degradation
  const freshStories = (brief.topStories || []).filter((s) => {
    return isFresh(s.publishedDate);
  });

  let resultStories: typeof brief.topStories;

  // If freshness gate would remove ALL stories, keep originals BUT mark clearly
  if (freshStories.length === 0 && brief.topStories && brief.topStories.length > 0) {
    resultStories = brief.topStories.map((s) => ({
      ...s,
      recencyLabel: s.publishedDate ? s.recencyLabel : "",
    }));
  } else {
    resultStories = freshStories;
  }

  return {
    ...brief,
    topStories: resultStories,
  };
}

// ============================================================================
// HELPER: Create a minimal brief for testing
// ============================================================================

function createTestBrief(topStories: Partial<EspressoStory>[]): EspressoBrief {
  return {
    briefDate: "2026-01-04",
    edition: "Sabtu, 4 Januari 2026",
    recipientName: "Test User",
    greeting: "Selamat pagi",
    theWorldInBrief: "Test brief overview.",
    topStories: topStories.map((s, i) => ({
      headline: s.headline || `Story ${i + 1}`,
      body: s.body || "Story body",
      whyItMatters: s.whyItMatters || "Why it matters",
      source: s.source || "Test Source",
      sourceType: s.sourceType || "local",
      url: s.url || "",
      verificationScore: s.verificationScore || 7,
      category: s.category || "important",
      publishedDate: s.publishedDate,
    })) as EspressoStory[],
    councilConsensus: "Test consensus",
    confidenceScore: 8,
    sourcesUsed: { search: ["Perplexity"], analysis: ["DeepSeek"] },
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

// Fixed "now" for consistent testing
const NOW = new Date("2026-01-04T10:00:00.000Z");

// Helper to create dates relative to NOW (returns full ISO string for accurate hour comparison)
function hoursAgo(hours: number): string {
  const d = new Date(NOW.getTime() - hours * 60 * 60 * 1000);
  return d.toISOString(); // Full ISO format for accurate time comparison
}

console.log("\n" + "=".repeat(70));
console.log("Phase 2.19-B - Freshness Gate for topStories");
console.log("=".repeat(70) + "\n");

// Test 1: Drops stale and undated stories
console.log("─".repeat(60));
console.log("Test 1: Drops stale and undated stories, keeps fresh ones");
console.log("─".repeat(60));

const test1Brief = createTestBrief([
  { headline: "Story A (fresh)", publishedDate: hoursAgo(5) },   // 5h ago - fresh
  { headline: "Story B (fresh)", publishedDate: hoursAgo(20) },  // 20h ago - fresh
  { headline: "Story C (stale)", publishedDate: hoursAgo(72) },  // 3 days ago - stale
  { headline: "Story D (missing)", publishedDate: "" },          // missing - dropped
]);

const result1 = enforceFreshTopStories(test1Brief, NOW);

assertEqual(
  result1.topStories.length,
  2,
  "Test 1: 4 stories in (2 fresh, 1 stale, 1 missing) → 2 remain"
);

assert(
  result1.topStories.some((s) => s.headline === "Story A (fresh)"),
  "Test 1: Story A (fresh) is preserved"
);

assert(
  result1.topStories.some((s) => s.headline === "Story B (fresh)"),
  "Test 1: Story B (fresh) is preserved"
);

assert(
  !result1.topStories.some((s) => s.headline === "Story C (stale)"),
  "Test 1: Story C (stale - 3 days ago) is dropped"
);

assert(
  !result1.topStories.some((s) => s.headline === "Story D (missing)"),
  "Test 1: Story D (missing date) is dropped"
);

// Test 2: All stale → graceful degradation (keep originals)
console.log("\n" + "─".repeat(60));
console.log("Test 2: All stale → graceful degradation (keep originals)");
console.log("─".repeat(60));

const test2Brief = createTestBrief([
  { headline: "Old Story 1", publishedDate: hoursAgo(48) },  // 2 days ago
  { headline: "Old Story 2", publishedDate: hoursAgo(72) },  // 3 days ago
  { headline: "Old Story 3", publishedDate: hoursAgo(96) },  // 4 days ago
]);

const result2 = enforceFreshTopStories(test2Brief, NOW);

assertEqual(
  result2.topStories.length,
  3,
  "Test 2: All 3 stories stale → graceful degradation keeps all 3"
);

assert(
  result2.topStories.every((s) => s.headline.startsWith("Old Story")),
  "Test 2: Original stories preserved in graceful degradation"
);

// Test 3: Invalid date string treated as missing
console.log("\n" + "─".repeat(60));
console.log("Test 3: Invalid date string treated as missing → dropped");
console.log("─".repeat(60));

const test3Brief = createTestBrief([
  { headline: "Valid Date Story", publishedDate: hoursAgo(10) },
  { headline: "Invalid Date Story", publishedDate: "not-a-date" },
  { headline: "Gibberish Date Story", publishedDate: "xyz123" },
]);

const result3 = enforceFreshTopStories(test3Brief, NOW);

assertEqual(
  result3.topStories.length,
  1,
  "Test 3: 1 valid date, 2 invalid → 1 remains"
);

assert(
  result3.topStories[0].headline === "Valid Date Story",
  "Test 3: Only 'Valid Date Story' preserved"
);

// Test 4: Edge case - exactly 24h old (boundary)
console.log("\n" + "─".repeat(60));
console.log("Test 4: Boundary - exactly 24h old should be included");
console.log("─".repeat(60));

const test4Brief = createTestBrief([
  { headline: "Exactly 24h Story", publishedDate: hoursAgo(24) },
  { headline: "Just Over 24h Story", publishedDate: hoursAgo(25) },
]);

const result4 = enforceFreshTopStories(test4Brief, NOW);

assertEqual(
  result4.topStories.length,
  1,
  "Test 4: 24h exactly is included, 25h is not"
);

assert(
  result4.topStories[0].headline === "Exactly 24h Story",
  "Test 4: 'Exactly 24h Story' is preserved"
);

// Test 5: tokohInsights not affected
console.log("\n" + "─".repeat(60));
console.log("Test 5: tokohInsights are NOT filtered (exempt from freshness)");
console.log("─".repeat(60));

const test5Brief: EspressoBrief = {
  ...createTestBrief([{ headline: "Fresh Story", publishedDate: hoursAgo(5) }]),
  tokohInsights: [
    {
      headline: "Old Tokoh Insight",
      body: "Insight body",
      whyItMatters: "Why",
      source: "Source",
      sourceType: "global",
      url: "",
      verificationScore: 7,
      category: "background",
      publishedDate: hoursAgo(168), // 7 days ago - would be stale
    },
  ],
};

const result5 = enforceFreshTopStories(test5Brief, NOW);

assertEqual(
  result5.tokohInsights?.length,
  1,
  "Test 5: tokohInsights preserved (1 story, even though old)"
);

assert(
  result5.tokohInsights?.[0].headline === "Old Tokoh Insight",
  "Test 5: tokohInsights content unchanged"
);

// Test 6: Graceful degradation marks undated stories
console.log("\n" + "─".repeat(60));
console.log("Test 6: Graceful degradation marks undated stories");
console.log("─".repeat(60));

const test6Brief = createTestBrief([
  { headline: "Undated Story 1", publishedDate: "" },
  { headline: "Undated Story 2" },  // undefined publishedDate
]);

const result6 = enforceFreshTopStories(test6Brief, NOW);

assertEqual(
  result6.topStories.length,
  2,
  "Test 6: 2 undated stories → graceful degradation keeps both"
);

assert(
  result6.topStories.every((s) => s.recencyLabel === ""),
  "Test 6: Undated stories have empty recencyLabel (no placeholder text)"
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(70) + "\n");

if (failed > 0) {
  console.log("❌ Some tests failed!");
  process.exit(1);
} else {
  console.log("✅ All tests passed!");
  process.exit(0);
}
