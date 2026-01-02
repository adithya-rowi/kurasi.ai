/**
 * Phase 2.3 - Perplexity JSON Recovery Tests
 *
 * Tests that the JSON extraction helper correctly recovers JSON from:
 * (a) Responses with conversational text before JSON
 * (b) Pure non-JSON responses (should fail gracefully)
 * (c) Clean JSON responses (should pass through)
 *
 * Run with: npx tsx tests/phase2_3_perplexity_json_recovery.test.ts
 */

// ============================================================================
// COPIED FROM llmCouncilV2.ts for standalone testing (avoids db.ts import)
// This must stay in sync with the production implementation
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
// TEST CASE 1: Recovery from conversational prefix
// ============================================================================

console.log("\n=== Test Case 1: Recovery from conversational prefix ===\n");

const conversationalResponse = `Sure! Here's the JSON:
{
  "searchQueries": ["test query"],
  "articles": [
    {
      "title": "Test Article 1",
      "summary": "This is a test article",
      "source": "Test Source",
      "url": "https://example.com/1"
    },
    {
      "title": "Test Article 2",
      "summary": "Another test article",
      "source": "Test Source 2",
      "url": "https://example.com/2"
    }
  ]
}`;

const result1 = extractJsonFromResponse(conversationalResponse);
assert(result1.success === true, "Extraction succeeds for conversational prefix");

if (result1.success) {
  const parsed = JSON.parse(result1.json);
  assertEqual(parsed.articles.length, 2, "Extracted JSON contains 2 articles");
  assertEqual(parsed.articles[0].title, "Test Article 1", "First article title is correct");
  assertEqual(parsed.searchQueries[0], "test query", "Search query is preserved");
}

// ============================================================================
// TEST CASE 2: Non-JSON response with no braces
// ============================================================================

console.log("\n=== Test Case 2: Non-JSON response (no braces) ===\n");

const pureTextResponse = "I appreciate your request, but I cannot search for news at this time. Please try again later.";

const result2 = extractJsonFromResponse(pureTextResponse);
assert(result2.success === false, "Extraction fails for pure text");
if (!result2.success) {
  assertEqual(result2.error, "Non-JSON response", "Error message is 'Non-JSON response'");
}

// ============================================================================
// TEST CASE 3: Clean JSON response (fast path)
// ============================================================================

console.log("\n=== Test Case 3: Clean JSON response ===\n");

const cleanJsonResponse = `{
  "articles": [
    { "title": "Clean Article", "url": "https://example.com/clean" }
  ]
}`;

const result3 = extractJsonFromResponse(cleanJsonResponse);
assert(result3.success === true, "Extraction succeeds for clean JSON");

if (result3.success) {
  const parsed = JSON.parse(result3.json);
  assertEqual(parsed.articles.length, 1, "Clean JSON has 1 article");
  assertEqual(parsed.articles[0].title, "Clean Article", "Article title is correct");
}

// ============================================================================
// TEST CASE 4: JSON with markdown code fence
// ============================================================================

console.log("\n=== Test Case 4: JSON with markdown code fence ===\n");

const codeFenceResponse = "```json\n{ \"articles\": [{ \"title\": \"Fenced Article\" }] }\n```";

const result4 = extractJsonFromResponse(codeFenceResponse);
assert(result4.success === true, "Extraction succeeds for code-fenced JSON");

if (result4.success) {
  const parsed = JSON.parse(result4.json);
  assertEqual(parsed.articles[0].title, "Fenced Article", "Fenced article title is correct");
}

// ============================================================================
// TEST CASE 5: Conversational suffix after JSON
// ============================================================================

console.log("\n=== Test Case 5: JSON with suffix text ===\n");

const suffixResponse = `{ "articles": [{ "title": "Suffix Test" }] }

Let me know if you need anything else!`;

const result5 = extractJsonFromResponse(suffixResponse);
assert(result5.success === true, "Extraction succeeds for JSON with suffix");

if (result5.success) {
  const parsed = JSON.parse(result5.json);
  assertEqual(parsed.articles[0].title, "Suffix Test", "Article with suffix is correct");
}

// ============================================================================
// TEST CASE 6: Both prefix and suffix text
// ============================================================================

console.log("\n=== Test Case 6: JSON with both prefix and suffix ===\n");

const bothResponse = `Here are the results:

{ "articles": [{ "title": "Both Test", "url": "https://example.com" }] }

Hope this helps!`;

const result6 = extractJsonFromResponse(bothResponse);
assert(result6.success === true, "Extraction succeeds for JSON with prefix and suffix");

if (result6.success) {
  const parsed = JSON.parse(result6.json);
  assertEqual(parsed.articles[0].title, "Both Test", "Article with both prefix/suffix is correct");
}

// ============================================================================
// TEST CASE 7: Invalid JSON structure (braces but not valid)
// ============================================================================

console.log("\n=== Test Case 7: Invalid JSON (malformed) ===\n");

const malformedResponse = "Here is the data: { articles: [broken json }";

const result7 = extractJsonFromResponse(malformedResponse);
assert(result7.success === false, "Extraction fails for malformed JSON");
if (!result7.success) {
  assertEqual(result7.error, "Non-JSON response", "Error message for malformed JSON");
}

// ============================================================================
// TEST CASE 8: Empty braces (valid but empty)
// ============================================================================

console.log("\n=== Test Case 8: Empty JSON object ===\n");

const emptyJsonResponse = "{}";

const result8 = extractJsonFromResponse(emptyJsonResponse);
assert(result8.success === true, "Extraction succeeds for empty JSON object");

if (result8.success) {
  const parsed = JSON.parse(result8.json);
  assertEqual(Object.keys(parsed).length, 0, "Empty JSON has no keys");
}

// ============================================================================
// TEST CASE 9: Array response
// ============================================================================

console.log("\n=== Test Case 9: Array JSON response ===\n");

const arrayResponse = `[{"title": "Array Item 1"}, {"title": "Array Item 2"}]`;

const result9 = extractJsonFromResponse(arrayResponse);
assert(result9.success === true, "Extraction succeeds for array JSON");

if (result9.success) {
  const parsed = JSON.parse(result9.json);
  assertEqual(parsed.length, 2, "Array has 2 items");
}

// ============================================================================
// TEST CASE 10: Only closing brace (edge case)
// ============================================================================

console.log("\n=== Test Case 10: Only closing brace ===\n");

const onlyClosingResponse = "Some text }";

const result10 = extractJsonFromResponse(onlyClosingResponse);
assert(result10.success === false, "Extraction fails for only closing brace");

// ============================================================================
// TEST CASE 11: Simulate Perplexity "I apprecia..." error
// ============================================================================

console.log("\n=== Test Case 11: Perplexity apologetic response ===\n");

const apologeticResponse = "I appreciate your interest in Indonesian business news. However, I'm unable to perform real-time web searches at this moment. Please try again later or use a different search tool.";

const result11 = extractJsonFromResponse(apologeticResponse);
assert(result11.success === false, "Extraction fails for apologetic response");
if (!result11.success) {
  assertEqual(result11.error, "Non-JSON response", "Error for apologetic response");
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.3 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
