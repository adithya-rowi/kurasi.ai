/**
 * Phase 1.1 - Query Generation Tests
 *
 * Tests that generateSearchQueries produces correct explicit search queries
 * based on user profile data (role, decisionContext, topics, entities).
 *
 * Run with: npx tsx tests/phase1_1_query_generation.test.ts
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

function assertRange(value: number, min: number, max: number, message: string): void {
  if (value >= min && value <= max) {
    console.log(`✅ PASS: ${message} (value: ${value})`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected: ${min}-${max}, Actual: ${value}`);
    failed++;
  }
}

function assertContains(arr: string[], substring: string, message: string): boolean {
  const found = arr.some(item => item.toLowerCase().includes(substring.toLowerCase()));
  if (found) {
    console.log(`✅ PASS: ${message}`);
    passed++;
    return true;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Looking for: "${substring}"`);
    console.log(`   In queries: ${arr.slice(0, 5).join(", ")}...`);
    failed++;
    return false;
  }
}

function assertMinCount(arr: string[], substring: string, minCount: number, message: string): void {
  const count = arr.filter(item => item.toLowerCase().includes(substring.toLowerCase())).length;
  if (count >= minCount) {
    console.log(`✅ PASS: ${message} (found ${count})`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected at least ${minCount}, found ${count}`);
    failed++;
  }
}

// ============================================================================
// TYPES AND FUNCTIONS (copied for standalone testing)
// ============================================================================

interface SearchContext {
  role: string;
  decisionContext: string | null;
  topics: string[];
  entities: string[];
  sources: string[];
  keywords: string[];
  avoidTopics: string[];
  language: string;
  languageName: string;
  hasIndonesianFocus: boolean;
  hasInternationalFocus: boolean;
  persona: string;
}

interface SearchQueryResult {
  queries: string[];
  requirements: {
    mustCoverTokoh: string[];
    mustCoverInstitusi: string[];
    mustCoverTopics: string[];
  };
}

function classifyEntity(entity: string): "tokoh" | "institusi" {
  const institutionPatterns = [
    /^(BI|OJK|BEI|IDX|Kemenkeu|Bappenas|BUMN|LPS|Kemkominfo|BPK|KPK|MUI|NU|Muhammadiyah)$/i,
    /\b(bank|indonesia|kementerian|badan|otoritas|bursa|lembaga|perusahaan|pt\.|tbk|inc|corp|ltd)\b/i,
    /^[A-Z]{2,5}$/, // Acronyms like OJK, BI, etc.
  ];

  for (const pattern of institutionPatterns) {
    if (pattern.test(entity)) {
      return "institusi";
    }
  }

  const words = entity.trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    const looksLikeName = words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]+$/.test(w));
    if (looksLikeName) {
      return "tokoh";
    }
  }

  return words.length === 1 ? "institusi" : "tokoh";
}

function generateSearchQueries(ctx: SearchContext): SearchQueryResult {
  const queries: string[] = [];
  const mustCoverTokoh: string[] = [];
  const mustCoverInstitusi: string[] = [];
  const mustCoverTopics: string[] = [];

  const now = new Date();
  const todayIndo = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const year = now.getFullYear();

  // 1. Role + DecisionContext queries (1-2 queries)
  if (ctx.role && ctx.decisionContext) {
    const roleQueryMap: Record<string, string[]> = {
      "Investor / Fund Manager": [
        `${ctx.decisionContext} investment outlook ${year}`,
        `${ctx.decisionContext} market analysis Indonesia hari ini`,
      ],
      "CEO / Founder": [
        `${ctx.decisionContext} business strategy ${year}`,
        `${ctx.decisionContext} startup ecosystem Indonesia hari ini`,
      ],
      "Eksekutif Korporat (CFO/COO/Head)": [
        `${ctx.decisionContext} corporate strategy ${year}`,
        `${ctx.decisionContext} regulatory update Indonesia hari ini`,
      ],
      "Komisaris / Penasihat Senior": [
        `${ctx.decisionContext} governance insights ${year}`,
        `${ctx.decisionContext} board advisory Indonesia hari ini`,
      ],
      "Konsultan / Advisor": [
        `${ctx.decisionContext} consulting trends ${year}`,
        `${ctx.decisionContext} advisory market Indonesia hari ini`,
      ],
      "Regulator / Pemerintahan": [
        `${ctx.decisionContext} policy update ${year}`,
        `${ctx.decisionContext} regulation Indonesia hari ini`,
      ],
      "Akademisi / Peneliti": [
        `${ctx.decisionContext} research insights ${year}`,
        `${ctx.decisionContext} academic perspective Indonesia hari ini`,
      ],
    };

    const roleQueries = roleQueryMap[ctx.role] || [
      `${ctx.decisionContext} latest news ${year}`,
      `${ctx.decisionContext} Indonesia hari ini`,
    ];
    queries.push(...roleQueries.slice(0, 2));
  } else if (ctx.role) {
    const genericRoleQueries: Record<string, string> = {
      "Investor / Fund Manager": `investment trends Indonesia ${year} hari ini`,
      "CEO / Founder": `startup business news Indonesia ${year} hari ini`,
      "Eksekutif Korporat (CFO/COO/Head)": `corporate news Indonesia ${year} hari ini`,
      "Komisaris / Penasihat Senior": `governance news Indonesia ${year} hari ini`,
      "Konsultan / Advisor": `consulting market Indonesia ${year} hari ini`,
      "Regulator / Pemerintahan": `regulatory news Indonesia ${year} hari ini`,
      "Akademisi / Peneliti": `research news Indonesia ${year} hari ini`,
    };
    queries.push(genericRoleQueries[ctx.role] || `business news Indonesia ${year} hari ini`);
  }

  // 2. Entity queries (tokoh and institusi)
  for (const entity of ctx.entities) {
    const entityType = classifyEntity(entity);

    if (entityType === "tokoh") {
      mustCoverTokoh.push(entity);
      queries.push(`${entity} latest interview OR podcast OR talk ${year}`);
      queries.push(`${entity} thoughts venture capital ${year}`);
      queries.push(`${entity} X Twitter recent insights`);
    } else {
      mustCoverInstitusi.push(entity);
      queries.push(`${entity} press release hari ini ${todayIndo}`);
      queries.push(`${entity} regulation update hari ini`);
    }
  }

  // 3. Topic queries
  for (const topic of ctx.topics) {
    mustCoverTopics.push(topic);
    queries.push(`${topic} Indonesia berita hari ini ${todayIndo}`);
    queries.push(`${topic} global latest today ${year}`);
  }

  // 4. Truncate intelligently to 8-12 queries
  let finalQueries = queries;
  if (finalQueries.length > 12) {
    const roleQueries = finalQueries.slice(0, 2);
    const remaining = finalQueries.slice(2);
    finalQueries = [...roleQueries, ...remaining.slice(0, 10)];
  }

  // Ensure minimum of 8 queries
  while (finalQueries.length < 8) {
    if (ctx.hasIndonesianFocus) {
      finalQueries.push(`berita ekonomi bisnis Indonesia hari ini ${todayIndo}`);
    } else {
      finalQueries.push(`global business news today ${year}`);
    }
    if (finalQueries.length >= 8) break;
    finalQueries.push(`market trends ${ctx.languageName === "Bahasa Indonesia" ? "Indonesia" : "global"} ${year}`);
  }

  finalQueries = finalQueries.slice(0, 12);

  return {
    queries: finalQueries,
    requirements: {
      mustCoverTokoh,
      mustCoverInstitusi,
      mustCoverTopics,
    },
  };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestSearchContext(overrides: Partial<SearchContext>): SearchContext {
  return {
    role: "Lainnya",
    decisionContext: null,
    topics: [],
    entities: [],
    sources: [],
    keywords: [],
    avoidTopics: [],
    language: "id",
    languageName: "Bahasa Indonesia",
    hasIndonesianFocus: true,
    hasInternationalFocus: false,
    persona: "",
    ...overrides,
  };
}

// ============================================================================
// TEST 1: Full profile test case from requirements
// ============================================================================

console.log("\n=== Test 1: Full profile with role, decisionContext, topics, entities ===\n");

const fullCtx = createTestSearchContext({
  role: "Investor / Fund Manager",
  decisionContext: "alokasi portofolio 2026",
  topics: ["Startup & Venture", "Pasar Modal"],
  entities: ["Bill Gurley", "OJK"],
});

const fullResult = generateSearchQueries(fullCtx);

console.log("Generated queries:");
fullResult.queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log("\nRequirements:");
console.log(`  Tokoh: ${fullResult.requirements.mustCoverTokoh.join(", ")}`);
console.log(`  Institusi: ${fullResult.requirements.mustCoverInstitusi.join(", ")}`);
console.log(`  Topics: ${fullResult.requirements.mustCoverTopics.join(", ")}`);
console.log("");

// Test: queries length between 8 and 12
assertRange(fullResult.queries.length, 8, 12, "queries length between 8 and 12");

// Test: at least 2 queries contain "Bill Gurley"
assertMinCount(fullResult.queries, "Bill Gurley", 2, "at least 2 queries contain 'Bill Gurley'");

// Test: at least 1 query contains "OJK"
assertMinCount(fullResult.queries, "OJK", 1, "at least 1 query contains 'OJK'");

// Test: at least 1 query contains "alokasi portofolio 2026" OR role-specific investment wording
const hasDecisionContextQuery = fullResult.queries.some(q =>
  q.toLowerCase().includes("alokasi portofolio") ||
  q.toLowerCase().includes("investment") ||
  q.toLowerCase().includes("portfolio")
);
assert(hasDecisionContextQuery, "at least 1 query uses decisionContext or role-specific investment wording");

// Test: at least 1 query contains "Startup & Venture" AND ("Indonesia" OR "hari ini")
const hasTopicWithIndonesia = fullResult.queries.some(q =>
  q.toLowerCase().includes("startup") &&
  (q.toLowerCase().includes("indonesia") || q.toLowerCase().includes("hari ini"))
);
assert(hasTopicWithIndonesia, "at least 1 query contains 'Startup' and 'Indonesia' or 'hari ini'");

// Test: requirements are populated correctly
assert(fullResult.requirements.mustCoverTokoh.includes("Bill Gurley"), "Bill Gurley is in mustCoverTokoh");
assert(fullResult.requirements.mustCoverInstitusi.includes("OJK"), "OJK is in mustCoverInstitusi");
assert(fullResult.requirements.mustCoverTopics.includes("Startup & Venture"), "Startup & Venture is in mustCoverTopics");
assert(fullResult.requirements.mustCoverTopics.includes("Pasar Modal"), "Pasar Modal is in mustCoverTopics");

// ============================================================================
// TEST 2: Null decisionContext doesn't break generation
// ============================================================================

console.log("\n=== Test 2: Null decisionContext doesn't break generation ===\n");

const nullCtx = createTestSearchContext({
  role: "CEO / Founder",
  decisionContext: null,
  topics: ["Fintech"],
  entities: ["Gojek"],
});

const nullResult = generateSearchQueries(nullCtx);

console.log("Generated queries (null decisionContext):");
nullResult.queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log("");

assertRange(nullResult.queries.length, 8, 12, "null decisionContext: queries length between 8 and 12");
assert(nullResult.queries.length > 0, "null decisionContext: generates queries without error");
assertContains(nullResult.queries, "Fintech", "null decisionContext: topic query included");

// ============================================================================
// TEST 3: Entity classification (tokoh vs institusi)
// ============================================================================

console.log("\n=== Test 3: Entity classification (tokoh vs institusi) ===\n");

// Test tokoh detection
assert(classifyEntity("Bill Gurley") === "tokoh", "Bill Gurley classified as tokoh");
assert(classifyEntity("Nadiem Makarim") === "tokoh", "Nadiem Makarim classified as tokoh");
assert(classifyEntity("John Doe") === "tokoh", "John Doe classified as tokoh");

// Test institusi detection
assert(classifyEntity("OJK") === "institusi", "OJK classified as institusi");
assert(classifyEntity("BI") === "institusi", "BI classified as institusi");
assert(classifyEntity("Kemenkeu") === "institusi", "Kemenkeu classified as institusi");
assert(classifyEntity("Bank Indonesia") === "institusi", "Bank Indonesia classified as institusi");
assert(classifyEntity("PT Telkom Tbk") === "institusi", "PT Telkom Tbk classified as institusi");

// ============================================================================
// TEST 4: Multiple entities generate appropriate queries
// ============================================================================

console.log("\n=== Test 4: Multiple entities generate appropriate queries ===\n");

const multiEntityCtx = createTestSearchContext({
  role: "Investor / Fund Manager",
  decisionContext: "due diligence startup",
  entities: ["Bill Gurley", "Marc Andreessen", "OJK", "Kemenkeu"],
  topics: ["Venture Capital"],
});

const multiResult = generateSearchQueries(multiEntityCtx);

console.log("Generated queries (multiple entities):");
multiResult.queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log("");

assertMinCount(multiResult.queries, "Bill Gurley", 2, "multiple entities: Bill Gurley has 2+ queries");
assertMinCount(multiResult.queries, "Marc Andreessen", 2, "multiple entities: Marc Andreessen has 2+ queries");
assertMinCount(multiResult.queries, "OJK", 1, "multiple entities: OJK has 1+ queries");
assertMinCount(multiResult.queries, "Kemenkeu", 1, "multiple entities: Kemenkeu has 1+ queries");

// Verify requirements
assert(multiResult.requirements.mustCoverTokoh.length === 2, "2 tokoh in requirements");
assert(multiResult.requirements.mustCoverInstitusi.length === 2, "2 institusi in requirements");

// ============================================================================
// TEST 5: Query count stays within bounds
// ============================================================================

console.log("\n=== Test 5: Query count bounds with many inputs ===\n");

const manyInputsCtx = createTestSearchContext({
  role: "CEO / Founder",
  decisionContext: "expansion strategy",
  entities: ["Person A", "Person B", "OJK", "BI", "BEI"],
  topics: ["Tech", "Finance", "Retail", "Healthcare"],
});

const manyResult = generateSearchQueries(manyInputsCtx);

console.log(`Query count with many inputs: ${manyResult.queries.length}`);
assertRange(manyResult.queries.length, 8, 12, "many inputs: queries still within 8-12 range");

// ============================================================================
// TEST 6: Minimum queries with empty inputs
// ============================================================================

console.log("\n=== Test 6: Minimum queries with minimal inputs ===\n");

const minimalCtx = createTestSearchContext({
  role: "Lainnya",
  decisionContext: null,
  entities: [],
  topics: [],
});

const minimalResult = generateSearchQueries(minimalCtx);

console.log(`Query count with minimal inputs: ${minimalResult.queries.length}`);
minimalResult.queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
console.log("");

assertRange(minimalResult.queries.length, 8, 12, "minimal inputs: queries padded to 8-12 range");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 1.1 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
