/**
 * Phase 2.21 - formatMetaLine helper tests
 *
 * Run with: npx tsx tests/phase2_21_formatMetaLine.test.ts
 */

import { formatMetaLine } from '../server/utils/formatters';

console.log("=== formatMetaLine tests ===\n");

let passed = 0;
let failed = 0;

function test(name: string, actual: string, expected: string): void {
  if (actual === expected) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Actual:   "${actual}"`);
    failed++;
  }
}

// Test 1: Only source
test("Test 1: Only source", formatMetaLine("", "", "Pasardana"), "Pasardana");

// Test 2: Full info
test("Test 2: Full info", formatMetaLine("Hari ini", "2026-01-04", "CNBC"), "Hari ini · 2026-01-04 · CNBC");

// Test 3: Empty everything returns empty
test("Test 3: Empty everything", formatMetaLine("", "", ""), "");

// Test 4: Partial - recency + source, no date
test("Test 4: Recency + source, no date", formatMetaLine("Hari ini", "", "CNBC"), "Hari ini · CNBC");

// Test 5: Only date
test("Test 5: Only date", formatMetaLine("", "2026-01-04", ""), "2026-01-04");

// Test 6: Recency + date, no source
test("Test 6: Recency + date, no source", formatMetaLine("Hari ini", "2026-01-04", ""), "Hari ini · 2026-01-04");

// Test 7: Whitespace handling
test("Test 7: Whitespace trimmed", formatMetaLine("  Hari ini  ", "  2026-01-04  ", "  CNBC  "), "Hari ini · 2026-01-04 · CNBC");

// Test 8: Undefined values
test("Test 8: Undefined values", formatMetaLine(undefined, undefined, "Source"), "Source");

// Test 9: No forbidden strings ever appear
const forbidden = ["Tanggal tidak tersedia", "Tanggal belum diverifikasi"];
const testCases = [
  formatMetaLine("", "", "Source"),
  formatMetaLine("", "", ""),
  formatMetaLine("Hari ini", "", ""),
  formatMetaLine(undefined, undefined, undefined),
];
const hasForbidden = testCases.some(r => forbidden.some(f => r.includes(f)));
if (!hasForbidden) {
  console.log("✅ PASS: Test 9: No forbidden placeholder strings");
  passed++;
} else {
  console.log("❌ FAIL: Test 9: Forbidden string found in output");
  failed++;
}

console.log("\n" + "=".repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All tests passed!");
  process.exit(0);
}
