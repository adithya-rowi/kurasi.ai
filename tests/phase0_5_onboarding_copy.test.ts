/**
 * Phase 0.5 - Onboarding Copy Tests
 *
 * Tests that the onboarding UI copy contains the expected strings.
 * This is a simple file-based test that reads Landing.tsx and checks for strings.
 *
 * Run with: npx tsx tests/phase0_5_onboarding_copy.test.ts
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let passed = 0;
let failed = 0;

function assertContains(content: string, substring: string, message: string): void {
  if (content.includes(substring)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Looking for: "${substring}"`);
    failed++;
  }
}

// ============================================================================
// READ LANDING.TSX
// ============================================================================

const landingPath = join(__dirname, "..", "client", "src", "pages", "Landing.tsx");
let landingContent: string;

try {
  landingContent = readFileSync(landingPath, "utf-8");
  console.log(`\n✅ Successfully read Landing.tsx (${landingContent.length} chars)\n`);
} catch (error) {
  console.error(`❌ Failed to read Landing.tsx: ${error}`);
  process.exit(1);
}

// ============================================================================
// TEST: Step indicators
// ============================================================================

console.log("=== Testing Step Indicators ===\n");

assertContains(landingContent, ">1/2<", "Step 1 indicator shows '1/2'");
assertContains(landingContent, ">2/2<", "Step 2 indicator shows '2/2'");

// ============================================================================
// TEST: Step 1 header
// ============================================================================

console.log("\n=== Testing Step 1 Header ===\n");

assertContains(landingContent, "Ceritakan kebutuhan Anda", "Step 1 title contains 'Ceritakan kebutuhan Anda'");

// ============================================================================
// TEST: Section labels
// ============================================================================

console.log("\n=== Testing Section Labels ===\n");

assertContains(landingContent, "Fokus (pilih beberapa)", "Topics section labeled 'Fokus (pilih beberapa)'");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 0.5 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
