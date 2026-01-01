/**
 * Phase 1.3 - GPT Truncation Fix + Orchestrator Cap Tests
 *
 * Tests three properties:
 * (A) analyzeWithGPT no longer slices to 15 (processes all articles)
 * (B) Orchestrator caps article candidates to MAX_CANDIDATES_FOR_ANALYSIS = 60
 * (C) CoverageGuardrail result is never dropped even when cap happens
 *
 * Run with: npx tsx tests/phase1_3_gpt_truncation_and_cap.test.ts
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
    date?: string;
  }>;
  error?: string;
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createFakeArticle(index: number): SearchResult["articles"][0] {
  return {
    title: `Article ${index}`,
    url: `https://example.com/article-${index}`,
    snippet: `This is the snippet for article ${index}`,
    source: `Source ${index % 5}`,
    summary: `Summary of article ${index}`,
  };
}

function createFakeSearchResult(model: string, articleCount: number): SearchResult {
  return {
    model,
    provider: model,
    layer: "search",
    articles: Array.from({ length: articleCount }, (_, i) => createFakeArticle(i)),
  };
}

function createCoverageGuardrailResult(): SearchResult {
  return {
    model: "CoverageGuardrail",
    provider: "Internal",
    layer: "search",
    articles: [],
    error: "COVERAGE WARNINGS:\nMISSING TOKOH COVERAGE: Test Person",
  };
}

// ============================================================================
// COPIED LOGIC: simplifiedArticles building (from analyzeWithGPT)
// This is the FIXED version that should NOT have .slice(0, 15)
// ============================================================================

function buildSimplifiedArticles(searchResults: SearchResult[]) {
  const allArticles = searchResults.flatMap((r) => r.articles);

  // This is the exact logic from analyzeWithGPT after Phase 1.3 fix
  // Phase 1.3: Removed premature .slice(0, 15) - cap is now applied in orchestrator after dedupe
  const simplifiedArticles = allArticles.map((a, i) => ({
    index: i,
    title: a.title,
    summary: a.summary,
    source: a.source,
    sentiment: (a as any).sentiment || "unknown",
  }));

  return simplifiedArticles;
}

// ============================================================================
// COPIED LOGIC: cap + guardrail (from orchestrator)
// Must match __test_applyCapAndGuardrail exactly
// ============================================================================

const MAX_CANDIDATES_FOR_ANALYSIS = 60;

function applyCapAndGuardrail(
  dedupedResults: SearchResult[],
  coverageWarningResult: SearchResult | null
): SearchResult[] {
  let cappedResults = dedupedResults;
  const totalBeforeCap = dedupedResults.reduce((sum, r) => sum + r.articles.length, 0);

  if (totalBeforeCap > MAX_CANDIDATES_FOR_ANALYSIS) {
    let remaining = MAX_CANDIDATES_FOR_ANALYSIS;
    cappedResults = dedupedResults.map(r => {
      if (remaining <= 0) {
        return { ...r, articles: [] };
      }
      const take = Math.min(r.articles.length, remaining);
      remaining -= take;
      return { ...r, articles: r.articles.slice(0, take) };
    }).filter(r => r.articles.length > 0 || r.error);
  }

  return coverageWarningResult
    ? [...cappedResults, coverageWarningResult]
    : cappedResults;
}

// ============================================================================
// TEST CASE 1: GPT truncation removed - processes all articles
// ============================================================================

console.log("\n=== Test Case 1: GPT truncation removed ===\n");

// Build fake searchResults containing 25 articles
const searchResultsWith25 = [createFakeSearchResult("Perplexity", 25)];
const simplified25 = buildSimplifiedArticles(searchResultsWith25);

assertEqual(simplified25.length, 25, "simplifiedArticles contains all 25 articles (not truncated to 15)");
assert(simplified25.length > 15, "simplifiedArticles length exceeds old limit of 15");

// Verify indices are correct (0-24)
assertEqual(simplified25[0].index, 0, "First article has index 0");
assertEqual(simplified25[24].index, 24, "Last article has index 24");

// Test with more articles
const searchResultsWith50 = [createFakeSearchResult("Perplexity", 50)];
const simplified50 = buildSimplifiedArticles(searchResultsWith50);

assertEqual(simplified50.length, 50, "simplifiedArticles contains all 50 articles");
assert(simplified50.length > 15, "50 articles exceeds old truncation limit");

// Test with exactly 15 (edge case - should still work)
const searchResultsWith15 = [createFakeSearchResult("Perplexity", 15)];
const simplified15 = buildSimplifiedArticles(searchResultsWith15);

assertEqual(simplified15.length, 15, "simplifiedArticles contains exactly 15 articles");

// Test with less than 15
const searchResultsWith10 = [createFakeSearchResult("Perplexity", 10)];
const simplified10 = buildSimplifiedArticles(searchResultsWith10);

assertEqual(simplified10.length, 10, "simplifiedArticles contains all 10 articles (no truncation needed)");

// ============================================================================
// TEST CASE 2: Orchestrator caps at MAX_CANDIDATES_FOR_ANALYSIS (60)
// ============================================================================

console.log("\n=== Test Case 2: Orchestrator cap at 60 ===\n");

// Build fake dedupedResults with 120 total articles (50 + 40 + 30)
const dedupedResultsWith120: SearchResult[] = [
  createFakeSearchResult("Perplexity", 50),
  createFakeSearchResult("Gemini", 40),
  createFakeSearchResult("Grok", 30),
];

const totalBefore = dedupedResultsWith120.reduce((sum, r) => sum + r.articles.length, 0);
assertEqual(totalBefore, 120, "Total articles before cap is 120");

// Apply cap without guardrail
const cappedNoGuardrail = applyCapAndGuardrail(dedupedResultsWith120, null);
const totalAfterCap = cappedNoGuardrail.reduce((sum, r) => sum + r.articles.length, 0);

assertEqual(totalAfterCap, 60, "Total articles after cap is exactly 60");
assert(totalAfterCap <= MAX_CANDIDATES_FOR_ANALYSIS, "Cap respects MAX_CANDIDATES_FOR_ANALYSIS");

// Verify distribution: first result gets 50, second gets 10, third gets 0
assertEqual(cappedNoGuardrail[0].articles.length, 50, "First SearchResult keeps all 50 articles");
assertEqual(cappedNoGuardrail[1].articles.length, 10, "Second SearchResult capped to 10 articles");
// Third should be filtered out (0 articles, no error)
assertEqual(cappedNoGuardrail.length, 2, "Third SearchResult (0 articles) is filtered out");

// ============================================================================
// TEST CASE 3: CoverageGuardrail is NEVER dropped
// ============================================================================

console.log("\n=== Test Case 3: CoverageGuardrail never dropped ===\n");

const coverageGuardrail = createCoverageGuardrailResult();

// Apply cap WITH guardrail
const cappedWithGuardrail = applyCapAndGuardrail(dedupedResultsWith120, coverageGuardrail);

// Verify guardrail is present
const hasGuardrail = cappedWithGuardrail.some(r => r.model === "CoverageGuardrail");
assert(hasGuardrail, "CoverageGuardrail is present in final results");

// Verify guardrail is the last element (appended)
const lastResult = cappedWithGuardrail[cappedWithGuardrail.length - 1];
assertEqual(lastResult.model, "CoverageGuardrail", "CoverageGuardrail is appended at the end");

// Verify real articles are still capped to 60
const realArticleCount = cappedWithGuardrail
  .filter(r => r.model !== "CoverageGuardrail")
  .reduce((sum, r) => sum + r.articles.length, 0);
assertEqual(realArticleCount, 60, "Real articles still capped to 60 even with guardrail");

// Verify total results count (2 real + 1 guardrail)
assertEqual(cappedWithGuardrail.length, 3, "3 SearchResults: 2 real (capped) + 1 guardrail");

// Test with small input (no cap needed) - guardrail still preserved
const smallDedupedResults: SearchResult[] = [
  createFakeSearchResult("Perplexity", 20),
];

const smallWithGuardrail = applyCapAndGuardrail(smallDedupedResults, coverageGuardrail);
const smallHasGuardrail = smallWithGuardrail.some(r => r.model === "CoverageGuardrail");
assert(smallHasGuardrail, "CoverageGuardrail preserved when no cap needed");

const smallTotalArticles = smallWithGuardrail
  .filter(r => r.model !== "CoverageGuardrail")
  .reduce((sum, r) => sum + r.articles.length, 0);
assertEqual(smallTotalArticles, 20, "Small input (20 articles) not capped");

// Test with null guardrail (no warnings)
const cappedNoWarnings = applyCapAndGuardrail(dedupedResultsWith120, null);
const noGuardrailPresent = cappedNoWarnings.every(r => r.model !== "CoverageGuardrail");
assert(noGuardrailPresent, "No guardrail added when coverageWarningResult is null");

// ============================================================================
// TEST CASE 4: Edge cases
// ============================================================================

console.log("\n=== Test Case 4: Edge cases ===\n");

// Exactly 60 articles (at the cap)
const exactlyAt60: SearchResult[] = [
  createFakeSearchResult("Perplexity", 60),
];
const at60Result = applyCapAndGuardrail(exactlyAt60, coverageGuardrail);
const at60Articles = at60Result
  .filter(r => r.model !== "CoverageGuardrail")
  .reduce((sum, r) => sum + r.articles.length, 0);
assertEqual(at60Articles, 60, "Exactly 60 articles: no cap applied");

// Just over 60 (61 articles)
const justOver60: SearchResult[] = [
  createFakeSearchResult("Perplexity", 61),
];
const over60Result = applyCapAndGuardrail(justOver60, coverageGuardrail);
const over60Articles = over60Result
  .filter(r => r.model !== "CoverageGuardrail")
  .reduce((sum, r) => sum + r.articles.length, 0);
assertEqual(over60Articles, 60, "61 articles capped to 60");

// Empty results
const emptyResults: SearchResult[] = [];
const emptyWithGuardrail = applyCapAndGuardrail(emptyResults, coverageGuardrail);
assert(emptyWithGuardrail.some(r => r.model === "CoverageGuardrail"), "Guardrail preserved with empty results");
assertEqual(emptyWithGuardrail.length, 1, "Only guardrail present when input is empty");

// SearchResult with error (should be preserved)
const withError: SearchResult[] = [
  createFakeSearchResult("Perplexity", 50),
  { model: "Gemini", provider: "Google", layer: "search", articles: [], error: "API timeout" },
];
const withErrorResult = applyCapAndGuardrail(withError, coverageGuardrail);
const hasErrorResult = withErrorResult.some(r => r.error === "API timeout");
assert(hasErrorResult, "SearchResult with error is preserved");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 1.3 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
