/**
 * Phase 2.21 - Strip Google grounding URL tests
 *
 * Run with: npx tsx tests/phase2_21_stripGoogleUrl.test.ts
 */

console.log("=== Strip Google URL tests ===\n");

function shouldStripUrl(url: string): boolean {
  return Boolean(url && url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect'));
}

let passed = 0;
let failed = 0;

function test(name: string, actual: boolean, expected: boolean): void {
  if (actual === expected) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
    failed++;
  }
}

// Test 1: Google grounding URL detected
test(
  "Test 1: Google grounding URL detected",
  shouldStripUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZxyz"),
  true
);

// Test 2: Normal URL not stripped
test(
  "Test 2: Normal URL not stripped",
  shouldStripUrl("https://cnbc.com/article/123"),
  false
);

// Test 3: Empty URL not stripped
test(
  "Test 3: Empty URL not stripped",
  shouldStripUrl(""),
  false
);

// Test 4: Other Google URL not stripped
test(
  "Test 4: Other Google URL not stripped",
  shouldStripUrl("https://google.com/search?q=test"),
  false
);

// Test 5: Partial match not stripped
test(
  "Test 5: Partial match not stripped",
  shouldStripUrl("https://example.com/vertexaisearch"),
  false
);

// Test 6: Full grounding path with params
test(
  "Test 6: Full grounding path with params",
  shouldStripUrl("https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABCD123?foo=bar"),
  true
);

console.log("\n" + "=".repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All tests passed!");
  process.exit(0);
}
