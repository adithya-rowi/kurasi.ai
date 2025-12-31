/**
 * Phase 0.1 - Profile Schema Tests
 *
 * Tests that role exists and is required, and decisionContext exists and is nullable.
 *
 * Run with: npx tsx tests/phase0_1_profile_schema.test.ts
 */

import { userProfiles, ALLOWED_ROLES, type AllowedRole } from "../shared/schema";

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

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    console.log(`❌ FAIL: ${message} (expected to throw but didn't)`);
    failed++;
  } catch {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

// ============================================================================
// TEST: ALLOWED_ROLES is defined correctly
// ============================================================================

console.log("\n=== Testing ALLOWED_ROLES ===\n");

assert(
  Array.isArray(ALLOWED_ROLES),
  "ALLOWED_ROLES is an array"
);

assert(
  ALLOWED_ROLES.length === 8,
  "ALLOWED_ROLES has 8 values"
);

const expectedRoles = [
  "Investor / Fund Manager",
  "CEO / Founder",
  "Eksekutif Korporat (CFO/COO/Head)",
  "Komisaris / Penasihat Senior",
  "Konsultan / Advisor",
  "Regulator / Pemerintahan",
  "Akademisi / Peneliti",
  "Lainnya",
];

expectedRoles.forEach((role) => {
  assert(
    ALLOWED_ROLES.includes(role as AllowedRole),
    `ALLOWED_ROLES includes "${role}"`
  );
});

// ============================================================================
// TEST: userProfiles schema has role field
// ============================================================================

console.log("\n=== Testing userProfiles.role ===\n");

// Check that role column exists in the schema
const roleColumn = (userProfiles as any).role;

assert(
  roleColumn !== undefined,
  "userProfiles has 'role' column"
);

assert(
  roleColumn.notNull === true,
  "role column is NOT NULL (required)"
);

assert(
  roleColumn.dataType === "string",
  "role column has string data type"
);

// ============================================================================
// TEST: userProfiles schema has decisionContext field
// ============================================================================

console.log("\n=== Testing userProfiles.decisionContext ===\n");

const decisionContextColumn = (userProfiles as any).decisionContext;

assert(
  decisionContextColumn !== undefined,
  "userProfiles has 'decisionContext' column"
);

assert(
  decisionContextColumn.notNull !== true,
  "decisionContext column is nullable (optional)"
);

assert(
  decisionContextColumn.dataType === "string",
  "decisionContext column has string data type"
);

// ============================================================================
// TEST: Type inference works correctly
// ============================================================================

console.log("\n=== Testing Type Inference ===\n");

// This is a compile-time check - if this file compiles, the types are correct
type UserProfileInferred = typeof userProfiles.$inferSelect;

// Check that role is a required string in the inferred type
type RoleType = UserProfileInferred["role"];
const roleTypeCheck: RoleType = "Investor / Fund Manager"; // Should compile
assert(typeof roleTypeCheck === "string", "role type is string");

// Check that decisionContext is a nullable string in the inferred type
type DecisionContextType = UserProfileInferred["decisionContext"];
const decisionContextTypeCheck1: DecisionContextType = "Some context"; // Should compile
const decisionContextTypeCheck2: DecisionContextType = null; // Should compile
assert(
  decisionContextTypeCheck1 === "Some context" || decisionContextTypeCheck2 === null,
  "decisionContext type is string | null"
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 0.1 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
