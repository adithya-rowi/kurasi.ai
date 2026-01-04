/**
 * Phase 2.21 - URL required for topStories tests
 *
 * Run with: npx tsx tests/phase2_21_url_required_topstories.test.ts
 */

// Copied from llmCouncilV2.ts for standalone testing (avoids DB import)
function requireVerifiedUrlForTopStories(stories: any[] = []): { before: number; after: number; filtered: any[] } {
  const before = stories.length;
  const filtered = stories.filter(s => s?.url && String(s.url).trim().length > 0);
  return { before, after: filtered.length, filtered };
}

console.log("=== URL required gate tests ===\n");

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean): void {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
}

const stories = [
  { headline: "A", url: "https://real.com/a" },
  { headline: "B", url: "" },
  { headline: "C", url: "   " },
  { headline: "D", url: "https://real.com/d" },
  { headline: "E", url: null },
];

const r = requireVerifiedUrlForTopStories(stories);

test("Test 1: before count correct", r.before === 5);
test("Test 2: after count correct", r.after === 2);
test("Test 3: Story A survived", r.filtered[0]?.headline === "A");
test("Test 4: Story D survived", r.filtered[1]?.headline === "D");
test("Test 5: All filtered stories have valid URLs", r.filtered.every(s => s.url && String(s.url).trim().length > 0));

// Additional edge cases
const emptyResult = requireVerifiedUrlForTopStories([]);
test("Test 6: Empty array returns empty", emptyResult.before === 0 && emptyResult.after === 0);

const undefinedResult = requireVerifiedUrlForTopStories(undefined as any);
test("Test 7: Undefined input returns empty", undefinedResult.before === 0 && undefinedResult.after === 0);

const allValidStories = [
  { headline: "X", url: "https://x.com" },
  { headline: "Y", url: "https://y.com" },
];
const allValidResult = requireVerifiedUrlForTopStories(allValidStories);
test("Test 8: All valid stories preserved", allValidResult.before === 2 && allValidResult.after === 2);

console.log("\n" + "=".repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All tests passed!");
  process.exit(0);
}
