/**
 * Phase 2.7 - Gemini Salvage Articles Tests
 *
 * Tests that Gemini article salvage logic works correctly:
 * (a) Bracket-depth extraction recovers articles when full JSON.parse fails
 * (b) Chunk splitting salvages individual articles
 * (c) Regex salvage as last resort
 * (d) Returns error when nothing is salvageable
 *
 * Run with: npx tsx tests/phase2_7_gemini_salvage_articles.test.ts
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

function extractArticlesArrayByDepth(text: string): string | null {
  const articlesKeyIndex = text.indexOf('"articles"');
  if (articlesKeyIndex === -1) return null;

  const colonIndex = text.indexOf(':', articlesKeyIndex);
  if (colonIndex === -1) return null;

  let bracketStart = -1;
  for (let i = colonIndex + 1; i < text.length; i++) {
    if (text[i] === '[') {
      bracketStart = i;
      break;
    } else if (text[i] !== ' ' && text[i] !== '\n' && text[i] !== '\r' && text[i] !== '\t') {
      return null;
    }
  }

  if (bracketStart === -1) return null;

  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let i = bracketStart + 1; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '[') depth++;
      if (char === ']') depth--;
      if (depth === 0) {
        return text.substring(bracketStart, i + 1);
      }
    }
  }

  return null;
}

function salvageArticlesWithRegex(text: string): any[] {
  const articles: any[] = [];
  const objectPattern = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"summary"\s*:\s*"[^"]*"[^{}]*\}/g;
  const matches = text.match(objectPattern) || [];

  for (const match of matches) {
    try {
      let fixed = match
        .replace(/,\s*}/g, '}')
        .replace(/'/g, '"');

      const obj = JSON.parse(fixed);
      if (obj.title && obj.summary) {
        articles.push(obj);
      }
    } catch {
      const titleMatch = match.match(/"title"\s*:\s*"([^"]*)"/);
      const summaryMatch = match.match(/"summary"\s*:\s*"([^"]*)"/);
      const sourceMatch = match.match(/"source"\s*:\s*"([^"]*)"/);
      const urlMatch = match.match(/"url"\s*:\s*"([^"]*)"/);

      if (titleMatch && summaryMatch) {
        articles.push({
          title: titleMatch[1],
          summary: summaryMatch[1],
          source: sourceMatch?.[1] || "",
          url: urlMatch?.[1] || "",
        });
      }
    }
  }

  return articles;
}

// Simulates the full Gemini parsing logic
interface ParseResult {
  articles: any[];
  error?: string;
}

function parseGeminiResponseEnhanced(rawContent: string): ParseResult {
  let textContent = rawContent
    .replace(/```json\n?|\n?```/g, "")
    .replace(/\[cite:\s*\d+\]/g, "")
    .trim();

  const jsonStart = textContent.indexOf('{');
  const jsonEnd = textContent.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    textContent = textContent.substring(jsonStart, jsonEnd + 1);
  }

  textContent = textContent
    .replace(/[\r\n]+/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, " ");

  textContent = textContent.replace(/,\s*([}\]])/g, '$1');

  let parsed;
  let parseError: string | null = null;

  try {
    parsed = JSON.parse(textContent);
  } catch (err: any) {
    // Fallback 1: Bracket-depth extraction
    const articlesArrayStr = extractArticlesArrayByDepth(textContent);
    if (articlesArrayStr) {
      try {
        const articlesArray = JSON.parse(articlesArrayStr);
        if (Array.isArray(articlesArray) && articlesArray.length > 0) {
          parsed = { articles: articlesArray };
        }
      } catch {
        // Continue to next fallback
      }
    }

    // Fallback 2: Chunk splitting
    if (!parsed && articlesArrayStr) {
      const articles: any[] = [];
      const innerContent = articlesArrayStr.slice(1, -1);
      const articleChunks = innerContent.split(/}\s*,\s*{/);

      for (let i = 0; i < articleChunks.length; i++) {
        try {
          let chunk = articleChunks[i].trim();
          if (!chunk.startsWith('{')) chunk = '{' + chunk;
          if (!chunk.endsWith('}')) chunk = chunk + '}';
          chunk = chunk.replace(/,\s*([}\]])/g, '$1');

          const art = JSON.parse(chunk);
          if (art.title && art.summary) {
            articles.push(art);
          }
        } catch {
          // Skip malformed chunk
        }
      }

      if (articles.length > 0) {
        parsed = { articles };
      }
    }

    // Fallback 3: Regex salvage
    if (!parsed) {
      const salvaged = salvageArticlesWithRegex(textContent);
      if (salvaged.length > 0) {
        parsed = { articles: salvaged };
      } else {
        parsed = { articles: [] };
        parseError = "JSON parse failed";
      }
    }
  }

  const result: ParseResult = { articles: parsed.articles || [] };
  if (parseError && result.articles.length === 0) {
    result.error = parseError;
  }
  return result;
}

// ============================================================================
// TEST CASE 1: Unescaped quote in summary breaks full JSON.parse
// ============================================================================

console.log("\n=== Test Case 1: Unescaped quote in summary ===\n");

// This has an unescaped quote in the second article's summary
const unescapedQuoteResponse = `Here are the results:
{"articles": [
  {"title": "First Article", "summary": "This article is about finance", "source": "News A", "url": "https://example.com/1"},
  {"title": "Second Article", "summary": "He said "hello" to everyone", "source": "News B", "url": "https://example.com/2"},
  {"title": "Third Article", "summary": "Another summary here", "source": "News C", "url": "https://example.com/3"}
]}`;

const result1 = parseGeminiResponseEnhanced(unescapedQuoteResponse);
// Should salvage at least the first article which is valid
assert(result1.articles.length >= 1, "Salvaged at least 1 article despite unescaped quote");
assert(result1.error === undefined, "No error when articles were salvaged");

// ============================================================================
// TEST CASE 2: Completely unusable response
// ============================================================================

console.log("\n=== Test Case 2: Completely unusable response ===\n");

const unusableResponse = "I apologize, but I cannot perform web searches at this time.";

const result2 = parseGeminiResponseEnhanced(unusableResponse);
assertEqual(result2.articles.length, 0, "Unusable response returns 0 articles");
assertEqual(result2.error, "JSON parse failed", "Unusable response sets error");

// ============================================================================
// TEST CASE 3: Valid JSON passes through (fast path)
// ============================================================================

console.log("\n=== Test Case 3: Valid JSON fast path ===\n");

const validJsonResponse = `{"articles": [
  {"title": "Valid Article", "summary": "This is valid", "source": "Source", "url": "https://example.com"}
]}`;

const result3 = parseGeminiResponseEnhanced(validJsonResponse);
assertEqual(result3.articles.length, 1, "Valid JSON has 1 article");
assert(result3.error === undefined, "Valid JSON has no error");
assertEqual(result3.articles[0].title, "Valid Article", "Article title correct");

// ============================================================================
// TEST CASE 4: JSON with garbage after articles array
// ============================================================================

console.log("\n=== Test Case 4: JSON with garbage after articles array ===\n");

const garbageAfterResponse = `{"articles": [
  {"title": "Article One", "summary": "First summary", "source": "Source 1"},
  {"title": "Article Two", "summary": "Second summary", "source": "Source 2"}
], "broken": undefined_value}`;

const result4 = parseGeminiResponseEnhanced(garbageAfterResponse);
assert(result4.articles.length >= 2, "Salvaged 2 articles despite garbage after array");
assertEqual(result4.articles[0].title, "Article One", "First article title correct");

// ============================================================================
// TEST CASE 5: Truncated response mid-article
// ============================================================================

console.log("\n=== Test Case 5: Truncated response ===\n");

const truncatedResponse = `{"articles": [
  {"title": "Complete Article", "summary": "This one is complete", "source": "News"},
  {"title": "Incomplete Article", "summary": "This one is trun`;

const result5 = parseGeminiResponseEnhanced(truncatedResponse);
// Should salvage the complete article
assert(result5.articles.length >= 1, "Salvaged at least 1 article from truncated response");

// ============================================================================
// TEST CASE 6: Bracket-depth handles nested brackets in strings
// ============================================================================

console.log("\n=== Test Case 6: Nested brackets in strings ===\n");

const nestedBracketsResponse = `{"articles": [
  {"title": "Article [with brackets]", "summary": "Contains [nested] brackets and {braces}", "source": "Source"}
], extra: broken}`;

const result6 = parseGeminiResponseEnhanced(nestedBracketsResponse);
assertEqual(result6.articles.length, 1, "Extracted article with nested brackets");
assertEqual(result6.articles[0].title, "Article [with brackets]", "Nested brackets preserved in title");

// ============================================================================
// TEST CASE 7: Prefix and suffix text with valid JSON
// ============================================================================

console.log("\n=== Test Case 7: Prefix and suffix text ===\n");

const prefixSuffixResponse = `Here are the search results:

{"articles": [
  {"title": "News Item", "summary": "Important news summary", "source": "Reuters", "url": "https://reuters.com/1"}
]}

Let me know if you need more information!`;

const result7 = parseGeminiResponseEnhanced(prefixSuffixResponse);
assertEqual(result7.articles.length, 1, "Extracted article from prefix/suffix response");
assert(result7.error === undefined, "No error for prefix/suffix response");

// ============================================================================
// TEST CASE 8: Empty articles array
// ============================================================================

console.log("\n=== Test Case 8: Empty articles array ===\n");

const emptyArrayResponse = `{"articles": []}`;

const result8 = parseGeminiResponseEnhanced(emptyArrayResponse);
assertEqual(result8.articles.length, 0, "Empty array returns 0 articles");
assert(result8.error === undefined, "Empty array is not an error");

// ============================================================================
// TEST CASE 9: Regex salvage when bracket extraction fails
// ============================================================================

console.log("\n=== Test Case 9: Regex salvage fallback ===\n");

// Malformed structure but individual articles are extractable
const regexSalvageResponse = `broken structure but contains
{"title": "Salvageable One", "summary": "Can be extracted", "source": "News"}
more garbage
{"title": "Salvageable Two", "summary": "Also extractable", "source": "Other"}
end`;

const result9 = parseGeminiResponseEnhanced(regexSalvageResponse);
assertEqual(result9.articles.length, 2, "Regex salvaged 2 articles");
assertEqual(result9.articles[0].title, "Salvageable One", "First salvaged article correct");

// ============================================================================
// TEST CASE 10: Citation tokens removed
// ============================================================================

console.log("\n=== Test Case 10: Citation tokens removed ===\n");

const citationResponse = `{"articles": [
  {"title": "Article with citation [cite: 1]", "summary": "Summary [cite: 2]", "source": "News"}
]}`;

const result10 = parseGeminiResponseEnhanced(citationResponse);
assertEqual(result10.articles.length, 1, "Article extracted after citation removal");

// ============================================================================
// TEST CASE 11: extractArticlesArrayByDepth unit test
// ============================================================================

console.log("\n=== Test Case 11: extractArticlesArrayByDepth direct test ===\n");

const directTestInput = `{"articles": [{"title": "Test", "summary": "Summary"}], "other": "field"}`;
const extracted = extractArticlesArrayByDepth(directTestInput);
assert(extracted !== null, "extractArticlesArrayByDepth found array");
if (extracted) {
  const parsed = JSON.parse(extracted);
  assertEqual(parsed.length, 1, "Extracted array has 1 element");
  assertEqual(parsed[0].title, "Test", "Extracted article title correct");
}

// ============================================================================
// TEST CASE 12: salvageArticlesWithRegex unit test
// ============================================================================

console.log("\n=== Test Case 12: salvageArticlesWithRegex direct test ===\n");

const regexInput = `random text {"title": "Regex Test", "summary": "Regex summary"} more text`;
const regexResult = salvageArticlesWithRegex(regexInput);
assertEqual(regexResult.length, 1, "Regex found 1 article");
assertEqual(regexResult[0].title, "Regex Test", "Regex article title correct");

// ============================================================================
// TEST CASE 13: No articles key (valid JSON, wrong structure)
// ============================================================================

console.log("\n=== Test Case 13: No articles key ===\n");

const noArticlesKeyResponse = `{"results": [{"title": "Wrong key", "summary": "Not in articles"}]}`;

const result13 = parseGeminiResponseEnhanced(noArticlesKeyResponse);
// Valid JSON without "articles" key - parses fine but has 0 articles
// This is NOT a parse error, just empty results
assertEqual(result13.articles.length, 0, "No articles key returns 0 articles");
assert(result13.error === undefined, "Valid JSON without articles is not an error");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.7 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
