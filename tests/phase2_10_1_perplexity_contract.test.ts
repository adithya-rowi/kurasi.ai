/**
 * Phase 2.10.1 - Perplexity Contract Violation Tests
 *
 * Tests that Perplexity response handling detects contract violations:
 * (a) searchQueries only (no articles) triggers retry
 * (b) Empty articles triggers retry
 * (c) Valid articles succeed
 * (d) Truncated JSON triggers retry
 *
 * Run with: npx tsx tests/phase2_10_1_perplexity_contract.test.ts
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

type JsonExtractionResult =
  | { success: true; json: string }
  | { success: false; error: string };

function extractJsonFromResponse(rawContent: string): JsonExtractionResult {
  const trimmed = rawContent.replace(/```json\n?|\n?```/g, "").trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return { success: true, json: trimmed };
    } catch {
      // Fall through
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, error: "Non-JSON response" };
  }

  const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    JSON.parse(jsonCandidate);
    return { success: true, json: jsonCandidate };
  } catch {
    return { success: false, error: "Non-JSON response" };
  }
}

// Simulates the Phase 2.10.1 Perplexity parsing logic
interface ParseResult {
  articles: any[];
  error?: string;
}

function parsePerplexityResponse(rawContent: string): ParseResult {
  // Clean content
  const cleanedContent = rawContent
    .replace(/```json\n?|\n?```/g, "")
    .replace(/\[cite:\s*[\d\-,\s]+\]/g, "");

  // Try JSON extraction
  const extraction = extractJsonFromResponse(cleanedContent);
  if (!extraction.success) {
    return { articles: [], error: "Non-JSON response" };
  }

  const parsed = JSON.parse(extraction.json);

  // Phase 2.10.1: Detect contract violation - searchQueries but no articles
  if (parsed.searchQueries && (!parsed.articles || !Array.isArray(parsed.articles))) {
    return { articles: [], error: "Contract violation" };
  }

  const articles = parsed.articles || [];

  if (articles.length === 0) {
    return { articles: [], error: "Empty articles" };
  }

  return { articles };
}

// Simulate retry behavior
interface AttemptResult {
  rawContent?: string;
  throwError?: string;
}

async function simulatePerplexityWithRetry(
  attempts: AttemptResult[]
): Promise<ParseResult> {
  const maxAttempts = 2;
  let lastError = "";

  for (let attempt = 0; attempt < Math.min(maxAttempts, attempts.length); attempt++) {
    const attemptData = attempts[attempt];

    if (attemptData.throwError) {
      lastError = "API error";
      if (attempt < maxAttempts - 1 && attempt < attempts.length - 1) {
        await new Promise(r => setTimeout(r, 10));
        continue;
      }
      return { articles: [], error: "API error" };
    }

    const rawContent = attemptData.rawContent || "";
    const result = parsePerplexityResponse(rawContent);

    if (result.error) {
      lastError = result.error;
      if (attempt < maxAttempts - 1 && attempt < attempts.length - 1) {
        await new Promise(r => setTimeout(r, 10));
        continue;
      }
      return result;
    }

    return result;
  }

  return { articles: [], error: lastError || "Unknown error" };
}

// ============================================================================
// TEST CASE 1: searchQueries only (no articles) - contract violation
// ============================================================================

console.log("\n=== Test Case 1: searchQueries only triggers contract violation ===\n");

const searchQueriesOnlyResponse = `{"searchQueries": ["berita ekonomi Indonesia", "Bank Indonesia"]}`;

const result1 = parsePerplexityResponse(searchQueriesOnlyResponse);
assertEqual(result1.articles.length, 0, "searchQueries-only returns 0 articles");
assertEqual(result1.error, "Contract violation", "searchQueries-only sets Contract violation error");

// ============================================================================
// TEST CASE 2: searchQueries with null articles
// ============================================================================

console.log("\n=== Test Case 2: searchQueries with null articles ===\n");

const searchQueriesNullArticles = `{"searchQueries": ["query1"], "articles": null}`;

const result2 = parsePerplexityResponse(searchQueriesNullArticles);
assertEqual(result2.articles.length, 0, "searchQueries+null articles returns 0");
assertEqual(result2.error, "Contract violation", "searchQueries+null articles is contract violation");

// ============================================================================
// TEST CASE 3: Empty articles array
// ============================================================================

console.log("\n=== Test Case 3: Empty articles array ===\n");

const emptyArticlesResponse = `{"articles": []}`;

const result3 = parsePerplexityResponse(emptyArticlesResponse);
assertEqual(result3.articles.length, 0, "Empty articles returns 0");
assertEqual(result3.error, "Empty articles", "Empty articles sets correct error");

// ============================================================================
// TEST CASE 4: Valid articles succeed
// ============================================================================

console.log("\n=== Test Case 4: Valid articles succeed ===\n");

const validResponse = `{"articles": [
  {"title": "News Article", "summary": "This is a summary", "source": "Reuters", "url": "https://example.com"}
]}`;

const result4 = parsePerplexityResponse(validResponse);
assertEqual(result4.articles.length, 1, "Valid response has 1 article");
assert(result4.error === undefined, "Valid response has no error");
assertEqual(result4.articles[0].title, "News Article", "Article title correct");

// ============================================================================
// TEST CASE 5: Truncated JSON triggers retry
// ============================================================================

console.log("\n=== Test Case 5: Truncated JSON triggers retry ===\n");

const truncatedResponse = `{"articles": [{"title": "Truncated", "summary": "This is trun`;

const result5 = parsePerplexityResponse(truncatedResponse);
assertEqual(result5.articles.length, 0, "Truncated JSON returns 0 articles");
assertEqual(result5.error, "Non-JSON response", "Truncated JSON is Non-JSON response");

// ============================================================================
// TEST CASE 6: First contract violation, second succeeds
// ============================================================================

console.log("\n=== Test Case 6: First contract violation, second succeeds ===\n");

const attempts6: AttemptResult[] = [
  { rawContent: `{"searchQueries": ["query"]}` },
  { rawContent: `{"articles": [{"title": "Success", "summary": "Got it"}]}` },
];

const result6 = await simulatePerplexityWithRetry(attempts6);
assertEqual(result6.articles.length, 1, "Got article on retry after contract violation");
assertEqual(result6.articles[0].title, "Success", "Correct article from retry");
assert(result6.error === undefined, "No error after successful retry");

// ============================================================================
// TEST CASE 7: First empty, second succeeds
// ============================================================================

console.log("\n=== Test Case 7: First empty, second succeeds ===\n");

const attempts7: AttemptResult[] = [
  { rawContent: `{"articles": []}` },
  { rawContent: `{"articles": [{"title": "Second Try", "summary": "Found"}]}` },
];

const result7 = await simulatePerplexityWithRetry(attempts7);
assertEqual(result7.articles.length, 1, "Got article on retry after empty");
assertEqual(result7.articles[0].title, "Second Try", "Correct article from second attempt");

// ============================================================================
// TEST CASE 8: Both attempts return contract violation
// ============================================================================

console.log("\n=== Test Case 8: Both attempts contract violation ===\n");

const attempts8: AttemptResult[] = [
  { rawContent: `{"searchQueries": ["q1"]}` },
  { rawContent: `{"searchQueries": ["q2"]}` },
];

const result8 = await simulatePerplexityWithRetry(attempts8);
assertEqual(result8.articles.length, 0, "Both violations return 0 articles");
assertEqual(result8.error, "Contract violation", "Error is Contract violation");

// ============================================================================
// TEST CASE 9: First truncated, second succeeds
// ============================================================================

console.log("\n=== Test Case 9: First truncated, second succeeds ===\n");

const attempts9: AttemptResult[] = [
  { rawContent: `{"articles": [{"title": "Cut off` },
  { rawContent: `{"articles": [{"title": "Complete", "summary": "Full article"}]}` },
];

const result9 = await simulatePerplexityWithRetry(attempts9);
assertEqual(result9.articles.length, 1, "Got article after truncated first attempt");
assertEqual(result9.articles[0].title, "Complete", "Correct article from retry");

// ============================================================================
// TEST CASE 10: searchQueries + articles string (not array)
// ============================================================================

console.log("\n=== Test Case 10: articles as string (not array) ===\n");

const articlesStringResponse = `{"searchQueries": ["q1"], "articles": "not an array"}`;

const result10 = parsePerplexityResponse(articlesStringResponse);
assertEqual(result10.articles.length, 0, "articles-as-string returns 0");
assertEqual(result10.error, "Contract violation", "articles-as-string is contract violation");

// ============================================================================
// TEST CASE 11: searchQueries + articles object (not array)
// ============================================================================

console.log("\n=== Test Case 11: articles as object (not array) ===\n");

const articlesObjectResponse = `{"searchQueries": ["q1"], "articles": {"title": "not an array"}}`;

const result11 = parsePerplexityResponse(articlesObjectResponse);
assertEqual(result11.articles.length, 0, "articles-as-object returns 0");
assertEqual(result11.error, "Contract violation", "articles-as-object is contract violation");

// ============================================================================
// TEST CASE 12: Valid response with extra fields
// ============================================================================

console.log("\n=== Test Case 12: Valid response with extra fields ===\n");

const extraFieldsResponse = `{
  "searchQueries": ["executed query"],
  "articles": [{"title": "Article", "summary": "Summary"}],
  "coverageReport": {"tokohCovered": ["A"]}
}`;

const result12 = parsePerplexityResponse(extraFieldsResponse);
assertEqual(result12.articles.length, 1, "Extra fields response has 1 article");
assert(result12.error === undefined, "Extra fields response has no error");

// ============================================================================
// TEST CASE 13: Multiple articles
// ============================================================================

console.log("\n=== Test Case 13: Multiple articles ===\n");

const multipleArticlesResponse = `{"articles": [
  {"title": "Article 1", "summary": "Summary 1"},
  {"title": "Article 2", "summary": "Summary 2"},
  {"title": "Article 3", "summary": "Summary 3"}
]}`;

const result13 = parsePerplexityResponse(multipleArticlesResponse);
assertEqual(result13.articles.length, 3, "Multiple articles parsed correctly");
assertEqual(result13.articles[2].title, "Article 3", "Third article correct");

// ============================================================================
// TEST CASE 14: JSON with markdown code fence
// ============================================================================

console.log("\n=== Test Case 14: JSON with code fence ===\n");

const codeFenceResponse = "```json\n{\"articles\": [{\"title\": \"Fenced\", \"summary\": \"In fence\"}]}\n```";

const result14 = parsePerplexityResponse(codeFenceResponse);
assertEqual(result14.articles.length, 1, "Code-fenced response has 1 article");
assert(result14.error === undefined, "Code-fenced response has no error");

// ============================================================================
// TEST CASE 15: Only searchQueries with empty array
// ============================================================================

console.log("\n=== Test Case 15: searchQueries with empty articles array ===\n");

const searchQueriesEmptyArticles = `{"searchQueries": ["q1", "q2"], "articles": []}`;

const result15 = parsePerplexityResponse(searchQueriesEmptyArticles);
assertEqual(result15.articles.length, 0, "searchQueries+empty articles returns 0");
assertEqual(result15.error, "Empty articles", "searchQueries+empty articles is Empty articles error");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.10.1 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
