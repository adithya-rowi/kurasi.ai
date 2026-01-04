console.log("=== Phase 2.23: Tokoh Search Query Tests ===\n");

function generateTokohQueries(entity: string, year: number): string[] {
  const queries: string[] = [];
  queries.push(`"${entity}" site:x.com ${year}`);
  queries.push(`"${entity}" tweet OR thread OR says ${year}`);
  queries.push(`"${entity}" interview OR podcast ${year}`);
  return queries;
}

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// Test 1: Paul Graham (international tokoh)
const pg = generateTokohQueries("Paul Graham", 2026);
test("Test 1: Paul Graham - has 3 queries", pg.length === 3);
test("Test 1: Paul Graham - name is quoted", pg[0].includes('"Paul Graham"'));
test("Test 1: Paul Graham - includes site:x.com", pg[0].includes('site:x.com'));

// Test 2: Indonesian tokoh (Sandiaga Uno)
const sandi = generateTokohQueries("Sandiaga Uno", 2026);
test("Test 2: Sandiaga Uno - name is quoted", sandi[0].includes('"Sandiaga Uno"'));
test("Test 2: Sandiaga Uno - works with Indonesian names", sandi.length === 3);

// Test 3: All queries include year
const naval = generateTokohQueries("Naval Ravikant", 2026);
test("Test 3: All queries include year", naval.every(q => q.includes("2026")));

// Test 4: Interview/podcast query exists
test("Test 4: Interview/podcast query exists", pg.some(q => q.includes("interview OR podcast")));

// Test 5: Tweet/thread query exists  
test("Test 5: Tweet/thread query exists", pg.some(q => q.includes("tweet OR thread")));

// Test 6: Gita Wirjawan (Indonesian business leader)
const gita = generateTokohQueries("Gita Wirjawan", 2026);
test("Test 6: Gita Wirjawan - works for any tokoh", gita[0].includes('"Gita Wirjawan"'));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
