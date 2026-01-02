/**
 * Phase 2.4 - Gemini JSON Recovery Tests
 *
 * Tests that the Gemini JSON parsing logic correctly:
 * (a) Recovers JSON from responses with prefix/suffix text
 * (b) Handles malformed JSON gracefully
 * (c) Strips citation tokens like [cite: 1]
 * (d) Salvages articles via regex when JSON.parse fails
 *
 * Run with: npx tsx tests/phase2_4_gemini_json_recovery.test.ts
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
// COPIED FROM llmCouncilV2.ts searchWithGemini for standalone testing
// This replicates the exact parsing logic used in production
// ============================================================================

interface GeminiParseResult {
  articles: Array<{
    title: string;
    summary: string;
    source?: string;
    url?: string;
  }>;
  error?: string;
}

function parseGeminiResponse(rawTextContent: string): GeminiParseResult {
  let textContent = rawTextContent;

  // Robust JSON parsing: remove markdown and citation tokens first
  textContent = textContent
    .replace(/```json\n?|\n?```/g, "")
    .replace(/\[cite:\s*\d+\]/g, "") // Remove [cite: 1] tokens
    .trim();

  // Extract JSON from response - handle prefix/suffix garbage
  const jsonStart = textContent.indexOf('{');
  const jsonEnd = textContent.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    textContent = textContent.substring(jsonStart, jsonEnd + 1);
  }

  // Remove control characters and fix newlines
  textContent = textContent
    .replace(/[\r\n]+/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, " ");

  // Fix trailing commas before } or ] (common JSON issue)
  textContent = textContent.replace(/,\s*([}\]])/g, '$1');

  let parsed;
  try {
    parsed = JSON.parse(textContent);
  } catch (parseError: any) {
    // First fallback: Try to extract and salvage articles with regex
    const articlesMatch = textContent.match(/"articles"\s*:\s*\[([\s\S]*?)\](?=\s*}?\s*$)/);
    if (articlesMatch) {
      // Try to salvage individual articles
      const articlesContent = articlesMatch[1];
      const articles: any[] = [];

      // Split by article boundaries (look for },{ pattern)
      const articleChunks = articlesContent.split(/}\s*,\s*{/);

      for (let i = 0; i < articleChunks.length; i++) {
        try {
          let chunk = articleChunks[i].trim();
          // Add missing braces
          if (!chunk.startsWith('{')) chunk = '{' + chunk;
          if (!chunk.endsWith('}')) chunk = chunk + '}';
          // Fix trailing commas in this chunk
          chunk = chunk.replace(/,\s*([}\]])/g, '$1');

          const art = JSON.parse(chunk);
          if (art.title && art.summary) {
            articles.push(art);
          }
        } catch (e) {
          // Skip malformed article chunk
        }
      }

      if (articles.length > 0) {
        return { articles };
      } else {
        return { articles: [], error: "JSON parse failed" };
      }
    } else {
      // No articles array found at all
      return { articles: [], error: "JSON parse failed" };
    }
  }

  return { articles: parsed.articles || [] };
}

// ============================================================================
// TEST CASE 1: Recovery from prefix + JSON + suffix
// ============================================================================

console.log("\n=== Test Case 1: Recovery from prefix + JSON + suffix ===\n");

const prefixSuffixResponse = `Here are the search results I found for you:

{"articles": [
  {"title": "Article One", "summary": "This is the first article summary", "source": "Source A", "url": "https://example.com/1"},
  {"title": "Article Two", "summary": "This is the second article summary", "source": "Source B", "url": "https://example.com/2"},
  {"title": "Article Three", "summary": "Third article with details", "source": "Source C", "url": "https://example.com/3"}
]}

I hope this helps! Let me know if you need more information.`;

const result1 = parseGeminiResponse(prefixSuffixResponse);
assert(result1.error === undefined, "No error for prefix+suffix response");
assertEqual(result1.articles.length, 3, "Recovered 3 articles from prefix+suffix");
assertEqual(result1.articles[0].title, "Article One", "First article title correct");
assertEqual(result1.articles[2].title, "Article Three", "Third article title correct");

// ============================================================================
// TEST CASE 2: Completely malformed response returns error
// ============================================================================

console.log("\n=== Test Case 2: Completely malformed returns error ===\n");

// This has no valid article structure at all - cannot be salvaged
const malformedResponse = `Here is the data:
{"articles": [
  {broken json without quotes or proper structure
]}`;

const result2 = parseGeminiResponse(malformedResponse);
assertEqual(result2.articles.length, 0, "Completely malformed returns 0 articles");
assertEqual(result2.error, "JSON parse failed", "Error is 'JSON parse failed'");

// ============================================================================
// TEST CASE 3: Citation tokens are stripped
// ============================================================================

console.log("\n=== Test Case 3: Citation tokens stripped ===\n");

const citationResponse = `{"articles": [
  {"title": "Article with citation [cite: 1]", "summary": "Summary text [cite: 2] with citations", "source": "News [cite: 3]"}
]}`;

const result3 = parseGeminiResponse(citationResponse);
assert(result3.error === undefined, "No error for citation response");
assertEqual(result3.articles.length, 1, "Got 1 article after stripping citations");
// Note: citations inside strings are stripped too by the global replace
assert(!result3.articles[0].title.includes("[cite:"), "Citation stripped from title");

// ============================================================================
// TEST CASE 4: Clean JSON (fast path)
// ============================================================================

console.log("\n=== Test Case 4: Clean JSON passes through ===\n");

const cleanResponse = `{"articles": [{"title": "Clean Article", "summary": "Clean summary"}]}`;

const result4 = parseGeminiResponse(cleanResponse);
assert(result4.error === undefined, "No error for clean JSON");
assertEqual(result4.articles.length, 1, "Clean JSON has 1 article");
assertEqual(result4.articles[0].title, "Clean Article", "Clean article title correct");

// ============================================================================
// TEST CASE 5: JSON with trailing commas (common Gemini issue)
// ============================================================================

console.log("\n=== Test Case 5: Trailing commas fixed ===\n");

const trailingCommaResponse = `{"articles": [
  {"title": "Comma Article", "summary": "Has trailing comma",},
]}`;

const result5 = parseGeminiResponse(trailingCommaResponse);
assert(result5.error === undefined, "No error after fixing trailing commas");
assertEqual(result5.articles.length, 1, "Trailing comma response has 1 article");

// ============================================================================
// TEST CASE 6: Newlines and control characters cleaned
// ============================================================================

console.log("\n=== Test Case 6: Control characters cleaned ===\n");

const newlineResponse = `{"articles": [
  {"title": "Newline\nArticle", "summary": "Has\r\nnewlines"}
]}`;

const result6 = parseGeminiResponse(newlineResponse);
assert(result6.error === undefined, "No error after cleaning control chars");
assertEqual(result6.articles.length, 1, "Newline response has 1 article");

// ============================================================================
// TEST CASE 7: Markdown code fence removed
// ============================================================================

console.log("\n=== Test Case 7: Markdown code fence removed ===\n");

const codeFenceResponse = "```json\n{\"articles\": [{\"title\": \"Fenced Article\", \"summary\": \"In code fence\"}]}\n```";

const result7 = parseGeminiResponse(codeFenceResponse);
assert(result7.error === undefined, "No error for code fence response");
assertEqual(result7.articles.length, 1, "Code fence has 1 article");
assertEqual(result7.articles[0].title, "Fenced Article", "Fenced article title correct");

// ============================================================================
// TEST CASE 8: Salvage articles via regex when JSON.parse fails
// ============================================================================

console.log("\n=== Test Case 8: Salvage articles via regex ===\n");

// This JSON has unquoted key at start which breaks JSON.parse
// but the articles array is valid and can be salvaged by regex
// The regex requires ]  followed by optional } and end of string
const salvageResponse = `{invalid_unquoted_key: "breaks parsing", "articles": [{"title": "Salvage One", "summary": "First salvageable"}, {"title": "Salvage Two", "summary": "Second salvageable"}]}`;

const result8 = parseGeminiResponse(salvageResponse);
// The regex salvage should work even if the outer JSON is invalid
assertEqual(result8.articles.length, 2, "Salvaged 2 articles via regex");
if (result8.articles.length >= 1) {
  assertEqual(result8.articles[0].title, "Salvage One", "First salvaged article correct");
}

// ============================================================================
// TEST CASE 9: No braces at all returns error
// ============================================================================

console.log("\n=== Test Case 9: No braces returns error ===\n");

const noBracesResponse = "I cannot search for news at this time. Please try again later.";

const result9 = parseGeminiResponse(noBracesResponse);
assertEqual(result9.articles.length, 0, "No braces returns 0 articles");
assertEqual(result9.error, "JSON parse failed", "No braces returns error");

// ============================================================================
// TEST CASE 10: Empty articles array
// ============================================================================

console.log("\n=== Test Case 10: Empty articles array ===\n");

const emptyArticlesResponse = `{"articles": []}`;

const result10 = parseGeminiResponse(emptyArticlesResponse);
assert(result10.error === undefined, "No error for empty articles");
assertEqual(result10.articles.length, 0, "Empty articles array has 0 articles");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.4 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
