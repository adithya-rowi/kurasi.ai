/**
 * Phase 2.2 - Personalization Enforcement Tests
 *
 * Tests that the whyItMatters validator works correctly:
 * (a) Detects missing whyItMatters
 * (b) Detects missing "Sebagai <ROLE>," prefix
 * (c) [REMOVED] - decision context match removed to allow natural writing
 * (d) Detects banned "Bagi eksekutif" phrase (for non-Eksekutif roles)
 * (e) Allows "Bagi eksekutif" for Eksekutif Korporat role
 * (f) Returns empty array when all rules pass
 *
 * Run with: npx tsx tests/phase2_2_personalization_enforcement.test.ts
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

function assertIncludes<T>(arr: T[], item: T, message: string): void {
  if (arr.includes(item)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Looking for: ${JSON.stringify(item)}`);
    console.log(`   In array: ${JSON.stringify(arr)}`);
    failed++;
  }
}

// ============================================================================
// COPIED FROM llmCouncilV2.ts for standalone testing
// ============================================================================

type WhyItMattersViolation = {
  index: number;
  reasons: string[];
  original: string;
};

function validateWhyItMatters(
  role: string,
  decisionContext: string | null,
  items: { whyItMatters?: string; headline?: string }[]
): WhyItMattersViolation[] {
  const violations: WhyItMattersViolation[] = [];
  const expectedPrefix = `Sebagai ${role},`;

  items.forEach((item, index) => {
    const reasons: string[] = [];
    const whyItMatters = item.whyItMatters || "";

    // Rule 1: whyItMatters must exist and be non-empty
    if (!whyItMatters || whyItMatters.trim().length === 0) {
      reasons.push("missing_why");
    } else {
      // Rule 2: must start with "Sebagai ${role},"
      const trimmed = whyItMatters.trim();
      if (!trimmed.startsWith(expectedPrefix)) {
        reasons.push("missing_prefix");
      }

      // Rule 3: REMOVED - decision context should inform Claude's thinking, not be copy-pasted
      // We trust Claude to make the advice contextually relevant without exact string match

      // Rule 4: generic phrase ban (unless role is Eksekutif Korporat)
      if (role !== "Eksekutif Korporat (CFO/COO/Head)") {
        if (trimmed.toLowerCase().includes("bagi eksekutif")) {
          reasons.push("uses_generic_exec_phrase");
        }
      }
    }

    if (reasons.length > 0) {
      violations.push({
        index,
        reasons,
        original: whyItMatters,
      });
    }
  });

  return violations;
}

// ============================================================================
// TEST CASE 1: Detects missing whyItMatters
// ============================================================================

console.log("\n=== Test Case 1: Detects missing whyItMatters ===\n");

const missingWhyItems = [
  { headline: "Test headline 1", whyItMatters: "" },
  { headline: "Test headline 2", whyItMatters: undefined },
  { headline: "Test headline 3" }, // whyItMatters completely missing
];

const missingWhyViolations = validateWhyItMatters(
  "Investor / Fund Manager",
  null,
  missingWhyItems
);

assertEqual(missingWhyViolations.length, 3, "Detects 3 missing whyItMatters");
assertIncludes(missingWhyViolations[0].reasons, "missing_why", "First item has missing_why reason");
assertIncludes(missingWhyViolations[1].reasons, "missing_why", "Second item has missing_why reason");
assertIncludes(missingWhyViolations[2].reasons, "missing_why", "Third item has missing_why reason");

// ============================================================================
// TEST CASE 2: Detects missing "Sebagai <ROLE>," prefix
// ============================================================================

console.log("\n=== Test Case 2: Detects missing prefix ===\n");

const missingPrefixItems = [
  { headline: "Test", whyItMatters: "This news is important for investors." },
  { headline: "Test", whyItMatters: "Bagi investor, ini penting untuk portofolio." },
  { headline: "Test", whyItMatters: "Sebagai investor, ini penting." }, // Wrong role format
];

const missingPrefixViolations = validateWhyItMatters(
  "Investor / Fund Manager",
  null,
  missingPrefixItems
);

assertEqual(missingPrefixViolations.length, 3, "Detects 3 missing prefix violations");
missingPrefixViolations.forEach((v, i) => {
  assertIncludes(v.reasons, "missing_prefix", `Item ${i} has missing_prefix reason`);
});

// Correct prefix should pass
const correctPrefixItems = [
  { headline: "Test", whyItMatters: "Sebagai Investor / Fund Manager, ini relevan untuk alokasi portofolio Anda." },
];

const correctPrefixViolations = validateWhyItMatters(
  "Investor / Fund Manager",
  null,
  correctPrefixItems
);

assertEqual(correctPrefixViolations.length, 0, "Correct prefix passes validation");

// ============================================================================
// TEST CASE 3: [REMOVED] Decision context exact match removed
// ============================================================================

console.log("\n=== Test Case 3: Decision context NOT enforced (allow natural writing) ===\n");

const decisionContext = "alokasi portofolio 2026";

// whyItMatters that is contextually relevant but doesn't contain exact decision context
const naturalWritingItems = [
  { headline: "Test", whyItMatters: "Sebagai Investor / Fund Manager, ini penting untuk strategi investasi Anda menjelang tahun depan." },
];

const naturalWritingViolations = validateWhyItMatters(
  "Investor / Fund Manager",
  decisionContext,
  naturalWritingItems
);

// Should pass because we no longer require exact decision context match
assertEqual(naturalWritingViolations.length, 0, "Natural writing without exact decision context passes");

// ============================================================================
// TEST CASE 4: Detects banned "Bagi eksekutif" phrase
// ============================================================================

console.log("\n=== Test Case 4: Detects banned phrase ===\n");

const bannedPhraseItems = [
  { headline: "Test", whyItMatters: "Sebagai Investor / Fund Manager, bagi eksekutif ini sangat penting." },
  { headline: "Test", whyItMatters: "Sebagai Investor / Fund Manager, BAGI EKSEKUTIF perlu perhatian." },
];

const bannedPhraseViolations = validateWhyItMatters(
  "Investor / Fund Manager",
  null,
  bannedPhraseItems
);

assertEqual(bannedPhraseViolations.length, 2, "Detects 2 banned phrase violations");
bannedPhraseViolations.forEach((v, i) => {
  assertIncludes(v.reasons, "uses_generic_exec_phrase", `Item ${i} has uses_generic_exec_phrase reason`);
});

// ============================================================================
// TEST CASE 5: Eksekutif Korporat is exempt from "Bagi eksekutif" ban
// ============================================================================

console.log("\n=== Test Case 5: Eksekutif Korporat exemption ===\n");

const eksekutifRole = "Eksekutif Korporat (CFO/COO/Head)";

const eksekutifItems = [
  { headline: "Test", whyItMatters: `Sebagai ${eksekutifRole}, bagi eksekutif ini sangat penting.` },
];

const eksekutifViolations = validateWhyItMatters(
  eksekutifRole,
  null,
  eksekutifItems
);

assertEqual(eksekutifViolations.length, 0, "Eksekutif Korporat can use 'Bagi eksekutif' phrase");

// ============================================================================
// TEST CASE 6: Returns empty array when all rules pass
// ============================================================================

console.log("\n=== Test Case 6: Valid items return no violations ===\n");

const validItems = [
  { headline: "Breaking news", whyItMatters: "Sebagai CEO / Founder, ini relevan untuk strategi ekspansi Anda." },
  { headline: "Market update", whyItMatters: "Sebagai CEO / Founder, perkembangan ini membuka peluang baru untuk bisnis Anda." },
  { headline: "Policy change", whyItMatters: "Sebagai CEO / Founder, perubahan regulasi ini mempengaruhi rencana operasional Anda." },
];

const validViolations = validateWhyItMatters(
  "CEO / Founder",
  null,
  validItems
);

assertEqual(validViolations.length, 0, "Valid items return 0 violations");

// With decision context
const validWithDC = [
  { headline: "Test", whyItMatters: "Sebagai CEO / Founder, ini relevan untuk IPO preparation Anda tahun depan." },
];

const validWithDCViolations = validateWhyItMatters(
  "CEO / Founder",
  "IPO preparation",
  validWithDC
);

assertEqual(validWithDCViolations.length, 0, "Valid items with decision context return 0 violations");

// ============================================================================
// TEST CASE 7: Multiple violations on single item
// ============================================================================

console.log("\n=== Test Case 7: Multiple violations on single item ===\n");

const multiViolationItems = [
  { headline: "Test", whyItMatters: "Bagi eksekutif, ini sangat penting." }, // missing_prefix + uses_generic_exec_phrase
];

const multiViolations = validateWhyItMatters(
  "Konsultan / Advisor",
  "digital transformation project",
  multiViolationItems
);

assertEqual(multiViolations.length, 1, "Single item with multiple violations");
assert(multiViolations[0].reasons.length >= 2, "Has at least 2 reasons");
assertIncludes(multiViolations[0].reasons, "missing_prefix", "Has missing_prefix");
assertIncludes(multiViolations[0].reasons, "uses_generic_exec_phrase", "Has uses_generic_exec_phrase");

// ============================================================================
// TEST CASE 8: Null decision context skips that check
// ============================================================================

console.log("\n=== Test Case 8: Null decision context skips check ===\n");

const noDCCheck = [
  { headline: "Test", whyItMatters: "Sebagai Regulator / Pemerintahan, kebijakan ini memerlukan evaluasi mendalam." },
];

const noDCViolations = validateWhyItMatters(
  "Regulator / Pemerintahan",
  null,
  noDCCheck
);

assertEqual(noDCViolations.length, 0, "Null decision context: validation passes without DC reference");

const emptyDCViolations = validateWhyItMatters(
  "Regulator / Pemerintahan",
  "",
  noDCCheck
);

assertEqual(emptyDCViolations.length, 0, "Empty string decision context: validation passes without DC reference");

const whitespaceDCViolations = validateWhyItMatters(
  "Regulator / Pemerintahan",
  "   ",
  noDCCheck
);

assertEqual(whitespaceDCViolations.length, 0, "Whitespace-only decision context: validation passes without DC reference");

// ============================================================================
// TEST CASE 9: Different roles have different prefixes
// ============================================================================

console.log("\n=== Test Case 9: Role-specific prefixes ===\n");

const roles = [
  "Investor / Fund Manager",
  "CEO / Founder",
  "Eksekutif Korporat (CFO/COO/Head)",
  "Konsultan / Advisor",
  "Regulator / Pemerintahan",
  "Akademisi / Peneliti",
];

roles.forEach(role => {
  const items = [
    { headline: "Test", whyItMatters: `Sebagai ${role}, ini sangat relevan untuk Anda.` },
  ];
  const violations = validateWhyItMatters(role, null, items);
  assertEqual(violations.length, 0, `Correct prefix for "${role}" passes`);
});

// Wrong role prefix fails
const wrongRoleItems = [
  { headline: "Test", whyItMatters: "Sebagai CEO / Founder, ini relevan untuk Anda." },
];

const wrongRoleViolations = validateWhyItMatters(
  "Konsultan / Advisor", // Different role
  null,
  wrongRoleItems
);

assertEqual(wrongRoleViolations.length, 1, "Wrong role prefix fails validation");
assertIncludes(wrongRoleViolations[0].reasons, "missing_prefix", "Has missing_prefix reason");

// ============================================================================
// TEST CASE 10: Violation index tracking
// ============================================================================

console.log("\n=== Test Case 10: Violation index tracking ===\n");

const mixedItems = [
  { headline: "Good", whyItMatters: "Sebagai CEO / Founder, ini sangat relevan." },           // index 0 - valid
  { headline: "Bad", whyItMatters: "Ini penting untuk bisnis." },                              // index 1 - invalid
  { headline: "Good", whyItMatters: "Sebagai CEO / Founder, perkembangan ini menarik." },     // index 2 - valid
  { headline: "Bad", whyItMatters: "" },                                                        // index 3 - invalid
  { headline: "Good", whyItMatters: "Sebagai CEO / Founder, perubahan signifikan." },          // index 4 - valid
];

const mixedViolations = validateWhyItMatters(
  "CEO / Founder",
  null,
  mixedItems
);

assertEqual(mixedViolations.length, 2, "Detects 2 violations in mixed array");
assertEqual(mixedViolations[0].index, 1, "First violation is at index 1");
assertEqual(mixedViolations[1].index, 3, "Second violation is at index 3");

// ============================================================================
// TEST CASE 11: Original text is preserved in violation
// ============================================================================

console.log("\n=== Test Case 11: Original text preserved ===\n");

const originalText = "This is the original whyItMatters text that violates rules.";
const preserveItems = [
  { headline: "Test", whyItMatters: originalText },
];

const preserveViolations = validateWhyItMatters(
  "Akademisi / Peneliti",
  null,
  preserveItems
);

assertEqual(preserveViolations[0].original, originalText, "Original text is preserved in violation");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 2.2 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
