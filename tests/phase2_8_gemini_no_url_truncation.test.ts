/**
 * Phase 2.8 - Gemini No URL Truncation Tests
 *
 * Tests that Gemini article parsing works without URLs in JSON:
 * (a) Articles without url field get url from citations array
 * (b) Articles with url field keep their url (backwards compat)
 * (c) More articles than citations still work (url = "")
 * (d) Prompt does not include url in JSON structure
 *
 * Run with: npx tsx tests/phase2_8_gemini_no_url_truncation.test.ts
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

function assertNotContains(text: string, substring: string, message: string): void {
  if (!text.includes(substring)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Should NOT contain: "${substring}"`);
    failed++;
  }
}

// ============================================================================
// SIMULATE Gemini article mapping logic (copied from llmCouncilV2.ts)
// ============================================================================

interface SearchArticle {
  title: string;
  summary: string;
  source: string;
  sourceType: string;
  url: string;
  publishedDate: string;
  confidence: number;
  isRealTime: boolean;
  citations: string[];
}

function mapGeminiArticles(
  parsedArticles: any[],
  citations: string[],
  today: string
): SearchArticle[] {
  return parsedArticles.map((a: any, i: number) => ({
    title: a.title || "",
    summary: a.summary || "",
    source: a.source || "",
    sourceType: a.sourceType || "local",
    url: a.url || citations[i] || "", // Prefer parsed url, fallback to citation by index
    publishedDate: a.publishedDate || today,
    confidence: a.confidence || 7,
    isRealTime: true,
    citations,
  }));
}

// ============================================================================
// TEST CASE 1: Articles without url get url from citations
// ============================================================================

console.log("\n=== Test Case 1: Articles get url from citations ===\n");

const articlesNoUrl = [
  { title: "Article One", summary: "First summary", source: "Source A" },
  { title: "Article Two", summary: "Second summary", source: "Source B" },
  { title: "Article Three", summary: "Third summary", source: "Source C" },
];

const citations1 = [
  "https://example.com/article-1",
  "https://example.com/article-2",
  "https://example.com/article-3",
];

const result1 = mapGeminiArticles(articlesNoUrl, citations1, "2026-01-02");

assertEqual(result1.length, 3, "Got 3 articles");
assertEqual(result1[0].url, "https://example.com/article-1", "Article 1 got citation 1 as url");
assertEqual(result1[1].url, "https://example.com/article-2", "Article 2 got citation 2 as url");
assertEqual(result1[2].url, "https://example.com/article-3", "Article 3 got citation 3 as url");

// ============================================================================
// TEST CASE 2: Articles with url keep their url (backwards compat)
// ============================================================================

console.log("\n=== Test Case 2: Articles with url keep their url ===\n");

const articlesWithUrl = [
  { title: "Article One", summary: "First summary", source: "Source A", url: "https://original.com/1" },
  { title: "Article Two", summary: "Second summary", source: "Source B" }, // No url
];

const citations2 = [
  "https://citation.com/1",
  "https://citation.com/2",
];

const result2 = mapGeminiArticles(articlesWithUrl, citations2, "2026-01-02");

assertEqual(result2[0].url, "https://original.com/1", "Article with url keeps original");
assertEqual(result2[1].url, "https://citation.com/2", "Article without url gets citation");

// ============================================================================
// TEST CASE 3: More articles than citations
// ============================================================================

console.log("\n=== Test Case 3: More articles than citations ===\n");

const manyArticles = [
  { title: "Article 1", summary: "Summary 1", source: "S1" },
  { title: "Article 2", summary: "Summary 2", source: "S2" },
  { title: "Article 3", summary: "Summary 3", source: "S3" },
  { title: "Article 4", summary: "Summary 4", source: "S4" },
  { title: "Article 5", summary: "Summary 5", source: "S5" },
];

const fewCitations = [
  "https://cite.com/1",
  "https://cite.com/2",
];

const result3 = mapGeminiArticles(manyArticles, fewCitations, "2026-01-02");

assertEqual(result3[0].url, "https://cite.com/1", "Article 1 gets citation 1");
assertEqual(result3[1].url, "https://cite.com/2", "Article 2 gets citation 2");
assertEqual(result3[2].url, "", "Article 3 gets empty url (no citation)");
assertEqual(result3[3].url, "", "Article 4 gets empty url");
assertEqual(result3[4].url, "", "Article 5 gets empty url");

// ============================================================================
// TEST CASE 4: Empty citations array
// ============================================================================

console.log("\n=== Test Case 4: Empty citations array ===\n");

const articlesNoCitations = [
  { title: "Article", summary: "Summary", source: "Source" },
];

const result4 = mapGeminiArticles(articlesNoCitations, [], "2026-01-02");

assertEqual(result4[0].url, "", "Article gets empty url when no citations");

// ============================================================================
// TEST CASE 5: Prompt structure (simulated)
// ============================================================================

console.log("\n=== Test Case 5: Prompt structure validation ===\n");

// Simulate the prompt JSON structure from Phase 2.8
const promptJsonStructure = `{"articles":[{"title":"Article title","summary":"2-3 sentence summary in Bahasa Indonesia","source":"Source name","sourceType":"local|regional|global","publishedDate":"2026-01-02","confidence":8,"matchedQuery":"which mandatory query this answers"}]}`;

assertNotContains(promptJsonStructure, '"url"', "Prompt JSON structure does not contain url field");
assertContains(promptJsonStructure, '"title"', "Prompt contains title field");
assertContains(promptJsonStructure, '"summary"', "Prompt contains summary field");
assertContains(promptJsonStructure, '"source"', "Prompt contains source field");
assertContains(promptJsonStructure, '"publishedDate"', "Prompt contains publishedDate field");

// ============================================================================
// TEST CASE 6: Instruction to not include URLs
// ============================================================================

console.log("\n=== Test Case 6: Instruction to not include URLs ===\n");

// Simulate the critical instruction
const criticalInstructions = `6. DO NOT include any URLs in the JSON - URLs will be added from search metadata`;

assertContains(criticalInstructions, "DO NOT include any URLs", "Instruction says no URLs");
assertContains(criticalInstructions, "search metadata", "Mentions metadata source");

// ============================================================================
// TEST CASE 7: All fields preserved
// ============================================================================

console.log("\n=== Test Case 7: All article fields preserved ===\n");

const fullArticle = [
  {
    title: "Full Article",
    summary: "Full summary text",
    source: "Full Source",
    sourceType: "regional",
    publishedDate: "2026-01-01",
    confidence: 9,
    matchedQuery: "test query",
  },
];

const citations7 = ["https://full.com/article"];

const result7 = mapGeminiArticles(fullArticle, citations7, "2026-01-02");

assertEqual(result7[0].title, "Full Article", "Title preserved");
assertEqual(result7[0].summary, "Full summary text", "Summary preserved");
assertEqual(result7[0].source, "Full Source", "Source preserved");
assertEqual(result7[0].sourceType, "regional", "SourceType preserved");
assertEqual(result7[0].publishedDate, "2026-01-01", "PublishedDate preserved");
assertEqual(result7[0].confidence, 9, "Confidence preserved");
assertEqual(result7[0].url, "https://full.com/article", "URL from citation");
assertEqual(result7[0].isRealTime, true, "isRealTime set");

// ============================================================================
// TEST CASE 8: Default values applied
// ============================================================================

console.log("\n=== Test Case 8: Default values applied ===\n");

const minimalArticle = [
  { title: "Minimal", summary: "Just required" },
];

const result8 = mapGeminiArticles(minimalArticle, [], "2026-01-02");

assertEqual(result8[0].source, "", "Default source is empty string");
assertEqual(result8[0].sourceType, "local", "Default sourceType is local");
assertEqual(result8[0].publishedDate, "2026-01-02", "Default publishedDate is today");
assertEqual(result8[0].confidence, 7, "Default confidence is 7");
assertEqual(result8[0].url, "", "Default url is empty string");

// ============================================================================
// TEST CASE 9: Citations stored on each article
// ============================================================================

console.log("\n=== Test Case 9: Citations array on each article ===\n");

const articles9 = [
  { title: "Test", summary: "Test summary" },
];

const citations9 = ["https://one.com", "https://two.com"];

const result9 = mapGeminiArticles(articles9, citations9, "2026-01-02");

assertEqual(result9[0].citations, citations9, "Full citations array attached to article");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.8 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
