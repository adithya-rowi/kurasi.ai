/**
 * URL Diagnostic Test
 * Run: npx tsx server/tests/url-diagnostic-test.ts
 */

console.log("=== URL DIAGNOSTIC TEST ===\n");

// Test 1: Check URL validation patterns
console.log("Test 1: URL patterns that would be considered valid/invalid...\n");

const testUrls = [
  { url: "https://www.kontan.co.id/news/123", expected: "VALID" },
  { url: "https://google.com/url?q=https://realsite.com", expected: "VALID (but redirect)" },
  { url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABC", expected: "STRIPPED by Gemini" },
  { url: "http://bisnis.com/article", expected: "VALID" },
  { url: "", expected: "EMPTY - will be dropped" },
  { url: null as any, expected: "NULL - will be dropped" },
  { url: undefined as any, expected: "UNDEFINED - will be dropped" },
  { url: "not-a-url", expected: "INVALID - verifyUrl will fail" },
];

testUrls.forEach(({ url, expected }) => {
  const hasUrl = url && String(url).trim().length > 0;
  const isGoogleGrounding = url && url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect');
  console.log(`  "${url || '(empty)'}"`);
  console.log(`    -> hasUrl: ${hasUrl}, isGoogleGrounding: ${isGoogleGrounding}`);
  console.log(`    -> Expected: ${expected}`);
  console.log();
});

// Test 2: Simulate the URL gate filter
console.log("\nTest 2: URL Gate Filter Simulation...\n");

function requireVerifiedUrlForTopStories(stories: any[] = []): { before: number; after: number; filtered: any[] } {
  const before = stories.length;
  const filtered = stories.filter(s => s?.url && String(s.url).trim().length > 0);
  return { before, after: filtered.length, filtered };
}

const mockStories = [
  { headline: "Story A with URL", url: "https://real.com/a" },
  { headline: "Story B without URL", url: "" },
  { headline: "Story C with whitespace URL", url: "   " },
  { headline: "Story D with URL", url: "https://real.com/d" },
  { headline: "Story E with null URL", url: null },
];

const result = requireVerifiedUrlForTopStories(mockStories);
console.log(`Before gate: ${result.before} stories`);
console.log(`After gate: ${result.after} stories`);
console.log(`Dropped: ${result.before - result.after} stories`);
console.log(`Surviving stories:`);
result.filtered.forEach((s, i) => {
  console.log(`  ${i}: "${s.headline}" -> ${s.url}`);
});

// Test 3: Check what happens if ALL URLs are empty
console.log("\n\nTest 3: What if ALL URLs are empty (like the bug)?...\n");

const allEmptyStories = [
  { headline: "Story 1", url: "" },
  { headline: "Story 2", url: "" },
  { headline: "Story 3", url: "" },
  { headline: "Story 4", url: "" },
];

const emptyResult = requireVerifiedUrlForTopStories(allEmptyStories);
console.log(`Before gate: ${emptyResult.before} stories`);
console.log(`After gate: ${emptyResult.after} stories`);
console.log(`ALL STORIES DROPPED!`);

console.log("\n=== DIAGNOSIS ===");
console.log("If all stories are dropped, the issue is one of:");
console.log("1. Claude is not returning URLs in the JSON");
console.log("2. URLs are being stripped by Google grounding filter");
console.log("3. URLs are failing HTTP verification (verifyUrl returns false)");
console.log("4. URLs are being cleared because they're not in verifiedUrls set");
console.log("\n=== RUN A REAL BRIEF TO SEE DIAGNOSTIC OUTPUT ===");
console.log("Go to the app and generate a brief, then check console for '=== URL DIAGNOSTIC ===' output");
