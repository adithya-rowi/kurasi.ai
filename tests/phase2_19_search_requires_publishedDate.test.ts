/**
 * Phase 2.19 - Search Providers Must Require publishedDate
 *
 * Tests that articles without publishedDate are dropped by search providers.
 *
 * Run with: npx tsx tests/phase2_19_search_requires_publishedDate.test.ts
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
// Article filtering logic (copied from llmCouncilV2.ts)
// ============================================================================

interface SearchArticle {
  title: string;
  summary: string;
  source: string;
  sourceType: string;
  url: string;
  publishedDate: string;
  confidence: number;
  isRealTime?: boolean;
  isSocialMedia?: boolean;
  citations?: string[];
}

/**
 * Filters articles to only include those with valid publishedDate.
 * This is the Phase 2.19 filtering logic used by all search providers.
 */
function filterArticlesWithPublishedDate(rawArticles: SearchArticle[]): {
  articles: SearchArticle[];
  droppedCount: number;
} {
  const articles = rawArticles.filter(
    (a) => a.publishedDate && a.publishedDate.trim() !== ""
  );
  const droppedCount = rawArticles.length - articles.length;
  return { articles, droppedCount };
}

/**
 * Simulates Perplexity response parsing with publishedDate filtering.
 */
function parsePerplexityResponse(mockArticles: any[]): SearchArticle[] {
  const rawArticles: SearchArticle[] = mockArticles.map((a: any) => ({
    title: a.title || "",
    summary: a.summary || "",
    source: a.source || "",
    sourceType: a.sourceType || "local",
    url: a.url || "",
    publishedDate: a.publishedDate || "",
    confidence: a.confidence || 7,
    isRealTime: true,
    citations: [],
  }));

  const { articles } = filterArticlesWithPublishedDate(rawArticles);
  return articles;
}

/**
 * Simulates Gemini response parsing with publishedDate filtering.
 */
function parseGeminiResponse(mockArticles: any[]): SearchArticle[] {
  const rawArticles: SearchArticle[] = mockArticles.map((a: any, i: number) => ({
    title: a.title || "",
    summary: a.summary || "",
    source: a.source || "",
    sourceType: a.sourceType || "local",
    url: a.url || "",
    publishedDate: a.publishedDate || "",
    confidence: a.confidence || 7,
    isRealTime: true,
    citations: [],
  }));

  const { articles } = filterArticlesWithPublishedDate(rawArticles);
  return articles;
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log("Phase 2.19 - Search Providers Must Require publishedDate");
console.log("=".repeat(70) + "\n");

// Test 1: Perplexity response with one article missing publishedDate
console.log("─".repeat(60));
console.log("Test 1: Perplexity - Article without publishedDate is DROPPED");
console.log("─".repeat(60));

const perplexityMock = [
  {
    title: "Breaking News: AI Regulation",
    summary: "Indonesia announces new AI regulations",
    source: "Kompas",
    url: "https://kompas.com/article1",
    publishedDate: "2026-01-04",
    confidence: 8,
  },
  {
    title: "Market Update",
    summary: "Stock market closes higher",
    source: "Reuters",
    url: "https://reuters.com/article2",
    publishedDate: "", // Missing publishedDate - should be dropped
    confidence: 7,
  },
  {
    title: "Tech News",
    summary: "New startup funding round",
    source: "TechCrunch",
    url: "https://techcrunch.com/article3",
    publishedDate: "2026-01-03",
    confidence: 8,
  },
];

const perplexityResult = parsePerplexityResponse(perplexityMock);

assertEqual(
  perplexityResult.length,
  2,
  "Perplexity: 3 articles in, 1 without publishedDate → 2 returned"
);

assert(
  perplexityResult.every((a) => a.publishedDate && a.publishedDate.trim() !== ""),
  "Perplexity: All returned articles have non-empty publishedDate"
);

assert(
  !perplexityResult.some((a) => a.title === "Market Update"),
  "Perplexity: Article 'Market Update' (no publishedDate) was dropped"
);

// Test 2: Gemini response with all articles having publishedDate
console.log("\n" + "─".repeat(60));
console.log("Test 2: Gemini - All articles with publishedDate are PRESERVED");
console.log("─".repeat(60));

const geminiMock = [
  {
    title: "Economic Outlook 2026",
    summary: "Indonesia GDP growth forecast revised",
    source: "Bloomberg",
    sourceType: "global",
    publishedDate: "2026-01-04",
    confidence: 9,
  },
  {
    title: "Banking Sector Update",
    summary: "OJK releases new guidelines",
    source: "Bisnis Indonesia",
    sourceType: "local",
    publishedDate: "2026-01-04",
    confidence: 8,
  },
  {
    title: "Startup News",
    summary: "Indonesian unicorn expansion",
    source: "DealStreetAsia",
    sourceType: "regional",
    publishedDate: "2026-01-03",
    confidence: 7,
  },
];

const geminiResult = parseGeminiResponse(geminiMock);

assertEqual(
  geminiResult.length,
  3,
  "Gemini: 3 articles in, all with publishedDate → 3 returned"
);

assert(
  geminiResult.every((a) => a.publishedDate && a.publishedDate.trim() !== ""),
  "Gemini: All returned articles have non-empty publishedDate"
);

// Test 3: Edge cases - null, undefined, whitespace publishedDate
console.log("\n" + "─".repeat(60));
console.log("Test 3: Edge cases - Various invalid publishedDate values");
console.log("─".repeat(60));

const edgeCaseMock = [
  {
    title: "Valid Article",
    summary: "Has valid date",
    source: "Source1",
    publishedDate: "2026-01-04",
  },
  {
    title: "Null Date",
    summary: "Has null date",
    source: "Source2",
    publishedDate: null, // null - should be dropped
  },
  {
    title: "Undefined Date",
    summary: "Has undefined date",
    source: "Source3",
    // publishedDate is undefined - should be dropped
  },
  {
    title: "Whitespace Date",
    summary: "Has whitespace date",
    source: "Source4",
    publishedDate: "   ", // whitespace only - should be dropped
  },
  {
    title: "Empty String Date",
    summary: "Has empty string date",
    source: "Source5",
    publishedDate: "", // empty string - should be dropped
  },
];

const edgeCaseResult = parsePerplexityResponse(edgeCaseMock);

assertEqual(
  edgeCaseResult.length,
  1,
  "Edge cases: 5 articles in, only 1 valid publishedDate → 1 returned"
);

assert(
  edgeCaseResult[0].title === "Valid Article",
  "Edge cases: Only 'Valid Article' with proper publishedDate preserved"
);

// Test 4: All articles missing publishedDate
console.log("\n" + "─".repeat(60));
console.log("Test 4: All articles missing publishedDate → Empty result");
console.log("─".repeat(60));

const allInvalidMock = [
  { title: "Article 1", summary: "No date", source: "S1" },
  { title: "Article 2", summary: "No date", source: "S2", publishedDate: "" },
  { title: "Article 3", summary: "No date", source: "S3", publishedDate: "  " },
];

const allInvalidResult = parsePerplexityResponse(allInvalidMock);

assertEqual(
  allInvalidResult.length,
  0,
  "All invalid: 3 articles without publishedDate → 0 returned"
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
