/**
 * Phase 2.10 - Perplexity Reliability Tests
 *
 * Tests that Perplexity response handling works correctly:
 * (a) Citation range tokens like [cite: 2-13] are stripped before parsing
 * (b) Refusal patterns are detected
 * (c) Content cleaning enables successful JSON extraction
 * (d) Empty articles detection works
 *
 * Run with: npx tsx tests/phase2_10_perplexity_reliability.test.ts
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

  // Fast path: try direct parse if it looks like JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return { success: true, json: trimmed };
    } catch {
      // Fall through to extraction
    }
  }

  // Slow path: try to extract JSON substring
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, error: "Non-JSON response" };
  }

  const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    JSON.parse(jsonCandidate); // Validate
    return { success: true, json: jsonCandidate };
  } catch {
    return { success: false, error: "Non-JSON response" };
  }
}

// Phase 2.10: Content cleaning function (simulates what's in searchWithPerplexity)
function cleanPerplexityContent(rawContent: string): string {
  return rawContent
    .replace(/```json\n?|\n?```/g, "")
    .replace(/\[cite:\s*[\d\-,\s]+\]/g, "");
}

// Phase 2.10: Refusal detection (simulates what's in searchWithPerplexity)
function isRefusalResponse(content: string): boolean {
  const refusalPatterns = [
    /I appreciate your/i,
    /I'm unable to/i,
    /I cannot perform/i,
    /I apologize/i,
    /cannot search/i,
  ];
  return refusalPatterns.some(p => p.test(content)) && !content.includes('"articles"');
}

// Simulate the full Perplexity parsing logic
interface ParseResult {
  articles: any[];
  error?: string;
}

function parsePerplexityResponse(rawContent: string): ParseResult {
  const cleanedContent = cleanPerplexityContent(rawContent);

  // Check for refusal
  if (isRefusalResponse(cleanedContent)) {
    return { articles: [], error: "Refusal response" };
  }

  // Try JSON extraction
  const extraction = extractJsonFromResponse(cleanedContent);
  if (!extraction.success) {
    return { articles: [], error: "Non-JSON response" };
  }

  const parsed = JSON.parse(extraction.json);
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
        await new Promise(r => setTimeout(r, 10)); // Fast jitter for tests
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
// TEST CASE 1: Citation range tokens stripped
// ============================================================================

console.log("\n=== Test Case 1: Citation range tokens stripped ===\n");

const citationRangeResponse = `{"articles": [
  {"title": "Article with range cite [cite: 2-13]", "summary": "Summary [cite: 1, 3, 5] here", "source": "News"}
]}`;

const cleaned1 = cleanPerplexityContent(citationRangeResponse);
assert(!cleaned1.includes("[cite:"), "Citation range tokens stripped from content");

const result1 = parsePerplexityResponse(citationRangeResponse);
assertEqual(result1.articles.length, 1, "Got 1 article despite citation ranges");
assert(result1.error === undefined, "No error for citation range content");

// ============================================================================
// TEST CASE 2: Simple citation tokens stripped
// ============================================================================

console.log("\n=== Test Case 2: Simple citation tokens stripped ===\n");

const simpleCiteResponse = `{"articles": [
  {"title": "Article [cite: 1]", "summary": "Summary [cite: 2]", "source": "News [cite: 3]"}
]}`;

const cleaned2 = cleanPerplexityContent(simpleCiteResponse);
assert(!cleaned2.includes("[cite:"), "Simple citation tokens stripped");

const result2 = parsePerplexityResponse(simpleCiteResponse);
assertEqual(result2.articles.length, 1, "Got 1 article after citation cleaning");

// ============================================================================
// TEST CASE 3: Complex citation patterns
// ============================================================================

console.log("\n=== Test Case 3: Complex citation patterns ===\n");

const complexCiteResponse = `{"articles": [
  {"title": "Test [cite: 1-5, 7, 9-12]", "summary": "Multi-range [cite: 2, 4-6, 8]", "source": "Src"}
]}`;

const cleaned3 = cleanPerplexityContent(complexCiteResponse);
assert(!cleaned3.includes("[cite:"), "Complex citation patterns stripped");

const result3 = parsePerplexityResponse(complexCiteResponse);
assertEqual(result3.articles.length, 1, "Got article despite complex citations");

// ============================================================================
// TEST CASE 4: Refusal response detected
// ============================================================================

console.log("\n=== Test Case 4: Refusal response detected ===\n");

const refusalResponse1 = "I appreciate your interest in Indonesian news, but I cannot search at this time.";
assert(isRefusalResponse(refusalResponse1), "Detects 'I appreciate your' refusal");

const refusalResponse2 = "I apologize, but I'm unable to perform web searches currently.";
assert(isRefusalResponse(refusalResponse2), "Detects 'I apologize' refusal");

const refusalResponse3 = "I cannot perform real-time searches. Please try again later.";
assert(isRefusalResponse(refusalResponse3), "Detects 'I cannot perform' refusal");

const result4 = parsePerplexityResponse(refusalResponse1);
assertEqual(result4.error, "Refusal response", "Refusal returns correct error");
assertEqual(result4.articles.length, 0, "Refusal returns 0 articles");

// ============================================================================
// TEST CASE 5: Refusal with articles is NOT a refusal
// ============================================================================

console.log("\n=== Test Case 5: Refusal text with articles is NOT refusal ===\n");

const refusalWithArticles = `I appreciate your request. Here are the "articles":
{"articles": [{"title": "Article", "summary": "Summary"}]}`;

assert(!isRefusalResponse(refusalWithArticles), "Refusal pattern with articles is NOT refusal");

const result5 = parsePerplexityResponse(refusalWithArticles);
assert(result5.error === undefined || result5.articles.length > 0, "Articles extracted despite refusal-like text");

// ============================================================================
// TEST CASE 6: Empty articles detection
// ============================================================================

console.log("\n=== Test Case 6: Empty articles detection ===\n");

const emptyArticlesResponse = `{"articles": []}`;

const result6 = parsePerplexityResponse(emptyArticlesResponse);
assertEqual(result6.articles.length, 0, "Empty articles returns 0");
assertEqual(result6.error, "Empty articles", "Empty articles sets correct error");

// ============================================================================
// TEST CASE 7: Non-JSON response detection
// ============================================================================

console.log("\n=== Test Case 7: Non-JSON response detection ===\n");

const nonJsonResponse = "Here are some news stories I found today about Indonesian markets...";

const result7 = parsePerplexityResponse(nonJsonResponse);
assertEqual(result7.articles.length, 0, "Non-JSON returns 0 articles");
assertEqual(result7.error, "Non-JSON response", "Non-JSON sets correct error");

// ============================================================================
// TEST CASE 8: Valid response passes through
// ============================================================================

console.log("\n=== Test Case 8: Valid response passes through ===\n");

const validResponse = `{"articles": [
  {"title": "News Article", "summary": "This is a summary", "source": "Reuters"}
]}`;

const result8 = parsePerplexityResponse(validResponse);
assertEqual(result8.articles.length, 1, "Valid response has 1 article");
assert(result8.error === undefined, "Valid response has no error");
assertEqual(result8.articles[0].title, "News Article", "Article title correct");

// ============================================================================
// TEST CASE 9: First attempt non-JSON, second succeeds
// ============================================================================

console.log("\n=== Test Case 9: First non-JSON, second succeeds (retry) ===\n");

const attempts9: AttemptResult[] = [
  { rawContent: "This is not JSON" },
  { rawContent: `{"articles": [{"title": "Retry Success", "summary": "Got it on retry"}]}` },
];

const result9 = await simulatePerplexityWithRetry(attempts9);
assertEqual(result9.articles.length, 1, "Got article on retry");
assertEqual(result9.articles[0].title, "Retry Success", "Correct article from retry");
assert(result9.error === undefined, "No error after successful retry");

// ============================================================================
// TEST CASE 10: First attempt throws, second succeeds
// ============================================================================

console.log("\n=== Test Case 10: First throws error, second succeeds ===\n");

const attempts10: AttemptResult[] = [
  { throwError: "Network timeout" },
  { rawContent: `{"articles": [{"title": "After Error", "summary": "Recovered"}]}` },
];

const result10 = await simulatePerplexityWithRetry(attempts10);
assertEqual(result10.articles.length, 1, "Got article after API error");
assertEqual(result10.articles[0].title, "After Error", "Correct article after recovery");

// ============================================================================
// TEST CASE 11: Both attempts return refusal
// ============================================================================

console.log("\n=== Test Case 11: Both attempts return refusal ===\n");

const attempts11: AttemptResult[] = [
  { rawContent: "I appreciate your request but I cannot search." },
  { rawContent: "I apologize, I'm unable to perform searches at this time." },
];

const result11 = await simulatePerplexityWithRetry(attempts11);
assertEqual(result11.articles.length, 0, "Both refusals return 0 articles");
assertEqual(result11.error, "Refusal response", "Error is Refusal response");

// ============================================================================
// TEST CASE 12: Both attempts throw errors
// ============================================================================

console.log("\n=== Test Case 12: Both attempts throw errors ===\n");

const attempts12: AttemptResult[] = [
  { throwError: "Rate limit exceeded" },
  { throwError: "Service unavailable" },
];

const result12 = await simulatePerplexityWithRetry(attempts12);
assertEqual(result12.articles.length, 0, "Both errors return 0 articles");
assertEqual(result12.error, "API error", "Error is API error");

// ============================================================================
// TEST CASE 13: Code fence stripped
// ============================================================================

console.log("\n=== Test Case 13: Code fence stripped ===\n");

const codeFenceResponse = "```json\n{\"articles\": [{\"title\": \"Fenced\", \"summary\": \"In fence\"}]}\n```";

const cleaned13 = cleanPerplexityContent(codeFenceResponse);
assert(!cleaned13.includes("```"), "Code fence removed");

const result13 = parsePerplexityResponse(codeFenceResponse);
assertEqual(result13.articles.length, 1, "Got article from code-fenced response");

// ============================================================================
// TEST CASE 14: Citation at very start of JSON
// ============================================================================

console.log("\n=== Test Case 14: Citation at JSON boundaries ===\n");

const citeBoundaryResponse = `[cite: 1]{"articles": [{"title": "Boundary Test", "summary": "Citation before JSON"}]}[cite: 2]`;

const cleaned14 = cleanPerplexityContent(citeBoundaryResponse);
assert(!cleaned14.includes("[cite:"), "Boundary citations stripped");

const result14 = parsePerplexityResponse(citeBoundaryResponse);
assertEqual(result14.articles.length, 1, "Got article with boundary citations");

// ============================================================================
// TEST CASE 15: First empty articles, second has articles
// ============================================================================

console.log("\n=== Test Case 15: First empty, second has articles ===\n");

const attempts15: AttemptResult[] = [
  { rawContent: `{"articles": []}` },
  { rawContent: `{"articles": [{"title": "Second Try", "summary": "Found on retry"}]}` },
];

const result15 = await simulatePerplexityWithRetry(attempts15);
assertEqual(result15.articles.length, 1, "Got article on second attempt");
assertEqual(result15.articles[0].title, "Second Try", "Correct article from second attempt");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.10 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
