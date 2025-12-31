/**
 * Phase 1.2 - Dedupe and Coverage Guardrail Tests
 *
 * Tests:
 * 1. URL deduplication with UTM params stripped
 * 2. Title-based deduplication fallback
 * 3. Coverage warnings for missing entities
 * 4. Recency rules in buildSearchPrompt
 *
 * Run with: npx tsx tests/phase1_2_dedupe_and_coverage.test.ts
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
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[], message: string): void {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertContains(text: string, substring: string, message: string): void {
  if (text.includes(substring)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${message}`);
    console.log(`   Looking for: "${substring}"`);
    console.log(`   In text: "${text.slice(0, 200)}..."`);
    failed++;
  }
}

// ============================================================================
// TYPES AND FUNCTIONS (copied for standalone testing)
// ============================================================================

interface SearchResult {
  model: string;
  provider: string;
  layer: "search";
  articles: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    date?: string;
  }>;
  error?: string;
}

interface CoverageResult {
  tokohCovered: string[];
  tokohMissing: string[];
  institusiCovered: string[];
  institusiMissing: string[];
  topicsCovered: string[];
  topicsMissing: string[];
  warnings: string[];
}

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

// URL normalization function
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source", "mc_cid", "mc_eid",
    ];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    // Return normalized: lowercase host, sorted params, no trailing slash
    let normalized = parsed.origin + parsed.pathname.replace(/\/$/, "");
    if (parsed.searchParams.toString()) {
      parsed.searchParams.sort();
      normalized += "?" + parsed.searchParams.toString();
    }
    return normalized.toLowerCase();
  } catch {
    // If URL parsing fails, return as-is lowercase
    return url.toLowerCase().trim();
  }
}

// Title normalization function
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

// Dedupe function
function dedupeSearchResults(searchResults: SearchResult[]): SearchResult[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  return searchResults.map(result => {
    if (result.error || !result.articles) {
      return result;
    }

    const dedupedArticles = result.articles.filter(article => {
      // Try URL-based dedupe first
      const normalizedUrl = normalizeUrl(article.url);
      if (seenUrls.has(normalizedUrl)) {
        return false;
      }

      // Fallback to title-based dedupe
      const normalizedTitle = normalizeTitle(article.title);
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }

      // Mark as seen
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      return true;
    });

    return {
      ...result,
      articles: dedupedArticles,
    };
  });
}

// Coverage computation
function computeCoverage(
  searchResults: SearchResult[],
  requirements: SearchQueryResult["requirements"]
): CoverageResult {
  // Collect all article content for matching
  const allContent: string[] = [];
  for (const result of searchResults) {
    if (result.articles) {
      for (const article of result.articles) {
        allContent.push(article.title.toLowerCase());
        allContent.push(article.snippet.toLowerCase());
        if (article.source) allContent.push(article.source.toLowerCase());
      }
    }
  }
  const combinedContent = allContent.join(" ");

  // Check tokoh coverage
  const tokohCovered: string[] = [];
  const tokohMissing: string[] = [];
  for (const tokoh of requirements.mustCoverTokoh) {
    if (combinedContent.includes(tokoh.toLowerCase())) {
      tokohCovered.push(tokoh);
    } else {
      tokohMissing.push(tokoh);
    }
  }

  // Check institusi coverage
  const institusiCovered: string[] = [];
  const institusiMissing: string[] = [];
  for (const institusi of requirements.mustCoverInstitusi) {
    if (combinedContent.includes(institusi.toLowerCase())) {
      institusiCovered.push(institusi);
    } else {
      institusiMissing.push(institusi);
    }
  }

  // Check topics coverage
  const topicsCovered: string[] = [];
  const topicsMissing: string[] = [];
  for (const topic of requirements.mustCoverTopics) {
    // Topics might be multi-word, check for partial match
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/);
    const hasMatch = topicWords.some(word => combinedContent.includes(word));
    if (hasMatch) {
      topicsCovered.push(topic);
    } else {
      topicsMissing.push(topic);
    }
  }

  // Generate warnings
  const warnings: string[] = [];
  if (tokohMissing.length > 0) {
    warnings.push(`MISSING TOKOH COVERAGE: ${tokohMissing.join(", ")}`);
  }
  if (institusiMissing.length > 0) {
    warnings.push(`MISSING INSTITUSI COVERAGE: ${institusiMissing.join(", ")}`);
  }
  if (topicsMissing.length > 0) {
    warnings.push(`MISSING TOPIC COVERAGE: ${topicsMissing.join(", ")}`);
  }

  return {
    tokohCovered,
    tokohMissing,
    institusiCovered,
    institusiMissing,
    topicsCovered,
    topicsMissing,
    warnings,
  };
}

// Create coverage warning result
function createCoverageWarningResult(coverage: CoverageResult): SearchResult | null {
  if (coverage.warnings.length === 0) {
    return null;
  }

  return {
    model: "CoverageGuardrail",
    provider: "Internal",
    layer: "search",
    articles: [],
    error: `COVERAGE WARNINGS:\n${coverage.warnings.join("\n")}`,
  };
}

// Build search prompt (simplified for testing recency rules)
function buildSearchPrompt(ctx: SearchContext, queryResult: SearchQueryResult): string {
  const sections: string[] = [];

  sections.push(`ROLE: ${ctx.role}`);
  if (ctx.decisionContext) {
    sections.push(`DECISION CONTEXT: ${ctx.decisionContext}`);
  }

  // Mandatory queries section
  if (queryResult.queries.length > 0) {
    sections.push(`
═══════════════════════════════════════════════════════════════
MANDATORY SEARCH QUERIES - EXECUTE ALL:
═══════════════════════════════════════════════════════════════
${queryResult.queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}
═══════════════════════════════════════════════════════════════`);
  }

  // Recency rules section
  sections.push(`
═══════════════════════════════════════════════════════════════
RECENCY RULES BY TYPE:
═══════════════════════════════════════════════════════════════
• INSTITUSI queries: LAST 24 HOURS only
• TOPIC queries: LAST 48 HOURS
• TOKOH queries: LAST 7 DAYS (prefer last 48h if available)
═══════════════════════════════════════════════════════════════`);

  return sections.join("\n\n");
}

// ============================================================================
// TEST 1: URL normalization strips tracking parameters
// ============================================================================

console.log("\n=== Test 1: URL normalization strips tracking parameters ===\n");

// Test UTM parameters
const url1 = "https://example.com/article?utm_source=twitter&utm_medium=social&id=123";
const normalized1 = normalizeUrl(url1);
assertEqual(normalized1, "https://example.com/article?id=123", "UTM params stripped, other params kept");

// Test fbclid
const url2 = "https://news.com/story?fbclid=abc123xyz";
const normalized2 = normalizeUrl(url2);
assertEqual(normalized2, "https://news.com/story", "fbclid stripped");

// Test gclid
const url3 = "https://news.com/story?gclid=xyz789&category=tech";
const normalized3 = normalizeUrl(url3);
assertEqual(normalized3, "https://news.com/story?category=tech", "gclid stripped, category kept");

// Test trailing slash removal
const url4 = "https://example.com/article/";
const normalized4 = normalizeUrl(url4);
assertEqual(normalized4, "https://example.com/article", "trailing slash removed");

// Test multiple tracking params
const url5 = "https://site.com/page?utm_source=a&utm_medium=b&utm_campaign=c&ref=d&mc_cid=e";
const normalized5 = normalizeUrl(url5);
assertEqual(normalized5, "https://site.com/page", "all tracking params stripped");

// ============================================================================
// TEST 2: URL-based deduplication
// ============================================================================

console.log("\n=== Test 2: URL-based deduplication ===\n");

const searchResults1: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Article A", url: "https://news.com/article1?utm_source=twitter", snippet: "Content A", source: "News" },
      { title: "Article B", url: "https://news.com/article2", snippet: "Content B", source: "News" },
    ],
  },
  {
    model: "Gemini",
    provider: "Google",
    layer: "search",
    articles: [
      { title: "Article A Copy", url: "https://news.com/article1?utm_medium=email", snippet: "Content A again", source: "News" },
      { title: "Article C", url: "https://news.com/article3", snippet: "Content C", source: "News" },
    ],
  },
];

const deduped1 = dedupeSearchResults(searchResults1);

// Count total articles after dedupe
const totalArticles1 = deduped1.reduce((sum, r) => sum + (r.articles?.length || 0), 0);
assertEqual(totalArticles1, 3, "URL dedupe: 4 articles -> 3 (duplicate URL removed)");

// First result should keep both articles
assertEqual(deduped1[0].articles.length, 2, "First search result keeps 2 articles");

// Second result should only have Article C (Article A Copy is duplicate by URL)
assertEqual(deduped1[1].articles.length, 1, "Second search result loses duplicate, keeps 1");
assertEqual(deduped1[1].articles[0].title, "Article C", "Article C is kept");

// ============================================================================
// TEST 3: Title-based deduplication fallback
// ============================================================================

console.log("\n=== Test 3: Title-based deduplication fallback ===\n");

const searchResults2: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Breaking: OJK Announces New Policy", url: "https://site-a.com/news1", snippet: "OJK news", source: "Site A" },
      { title: "Tech News Today", url: "https://site-a.com/news2", snippet: "Tech content", source: "Site A" },
    ],
  },
  {
    model: "Grok",
    provider: "xAI",
    layer: "search",
    articles: [
      { title: "breaking: ojk announces new policy", url: "https://site-b.com/article", snippet: "Same OJK news", source: "Site B" },
      { title: "Different Article", url: "https://site-b.com/different", snippet: "Different content", source: "Site B" },
    ],
  },
];

const deduped2 = dedupeSearchResults(searchResults2);

const totalArticles2 = deduped2.reduce((sum, r) => sum + (r.articles?.length || 0), 0);
assertEqual(totalArticles2, 3, "Title dedupe: 4 articles -> 3 (same title different URL removed)");

// ============================================================================
// TEST 4: Coverage computation - all covered
// ============================================================================

console.log("\n=== Test 4: Coverage computation - all entities covered ===\n");

const searchResultsWithContent: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Bill Gurley speaks at conference", url: "https://a.com/1", snippet: "Venture capital insights from Bill Gurley", source: "TechCrunch" },
      { title: "OJK releases new regulation", url: "https://a.com/2", snippet: "OJK announces fintech policy", source: "Kontan" },
      { title: "Startup ecosystem grows", url: "https://a.com/3", snippet: "Startup and venture capital news", source: "Bloomberg" },
    ],
  },
];

const requirements1: SearchQueryResult["requirements"] = {
  mustCoverTokoh: ["Bill Gurley"],
  mustCoverInstitusi: ["OJK"],
  mustCoverTopics: ["Startup & Venture"],
};

const coverage1 = computeCoverage(searchResultsWithContent, requirements1);

assertEqual(coverage1.tokohCovered.length, 1, "1 tokoh covered");
assertEqual(coverage1.tokohMissing.length, 0, "0 tokoh missing");
assertEqual(coverage1.institusiCovered.length, 1, "1 institusi covered");
assertEqual(coverage1.institusiMissing.length, 0, "0 institusi missing");
assertEqual(coverage1.topicsCovered.length, 1, "1 topic covered");
assertEqual(coverage1.topicsMissing.length, 0, "0 topics missing");
assertEqual(coverage1.warnings.length, 0, "no warnings when all covered");

// ============================================================================
// TEST 5: Coverage computation - missing entities
// ============================================================================

console.log("\n=== Test 5: Coverage computation - missing entities ===\n");

const searchResultsPartial: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Tech news today", url: "https://a.com/1", snippet: "General technology updates", source: "News" },
    ],
  },
];

const requirements2: SearchQueryResult["requirements"] = {
  mustCoverTokoh: ["Bill Gurley", "Marc Andreessen"],
  mustCoverInstitusi: ["OJK", "Kemenkeu"],
  mustCoverTopics: ["Fintech", "Pasar Modal"],
};

const coverage2 = computeCoverage(searchResultsPartial, requirements2);

assertEqual(coverage2.tokohMissing.length, 2, "2 tokoh missing");
assertEqual(coverage2.institusiMissing.length, 2, "2 institusi missing");
assertEqual(coverage2.topicsMissing.length, 2, "2 topics missing");
assertEqual(coverage2.warnings.length, 3, "3 warning messages generated");

// Verify warning content
assert(coverage2.warnings[0].includes("Bill Gurley"), "warning mentions Bill Gurley");
assert(coverage2.warnings[0].includes("Marc Andreessen"), "warning mentions Marc Andreessen");
assert(coverage2.warnings[1].includes("OJK"), "warning mentions OJK");
assert(coverage2.warnings[1].includes("Kemenkeu"), "warning mentions Kemenkeu");

// ============================================================================
// TEST 6: Coverage warning result creation
// ============================================================================

console.log("\n=== Test 6: Coverage warning result creation ===\n");

const coverageWithWarnings: CoverageResult = {
  tokohCovered: [],
  tokohMissing: ["Bill Gurley"],
  institusiCovered: ["OJK"],
  institusiMissing: [],
  topicsCovered: [],
  topicsMissing: ["Fintech"],
  warnings: ["MISSING TOKOH COVERAGE: Bill Gurley", "MISSING TOPIC COVERAGE: Fintech"],
};

const warningResult = createCoverageWarningResult(coverageWithWarnings);

assert(warningResult !== null, "warning result created when warnings exist");
assertEqual(warningResult!.model, "CoverageGuardrail", "model is CoverageGuardrail");
assertEqual(warningResult!.provider, "Internal", "provider is Internal");
assert(warningResult!.error!.includes("Bill Gurley"), "error contains tokoh name");
assert(warningResult!.error!.includes("Fintech"), "error contains topic name");

// Test no warnings case
const coverageNoWarnings: CoverageResult = {
  tokohCovered: ["Bill Gurley"],
  tokohMissing: [],
  institusiCovered: ["OJK"],
  institusiMissing: [],
  topicsCovered: ["Fintech"],
  topicsMissing: [],
  warnings: [],
};

const noWarningResult = createCoverageWarningResult(coverageNoWarnings);
assertEqual(noWarningResult, null, "no warning result when no warnings");

// ============================================================================
// TEST 7: Recency rules in buildSearchPrompt
// ============================================================================

console.log("\n=== Test 7: Recency rules in buildSearchPrompt ===\n");

const testContext: SearchContext = {
  role: "Investor / Fund Manager",
  decisionContext: "Portfolio allocation",
  topics: ["Fintech"],
  entities: ["OJK"],
  sources: [],
  keywords: [],
  avoidTopics: [],
  language: "id",
  languageName: "Bahasa Indonesia",
  hasIndonesianFocus: true,
  hasInternationalFocus: false,
  persona: "",
};

const testQueryResult: SearchQueryResult = {
  queries: ["OJK regulation hari ini", "Fintech Indonesia berita"],
  requirements: {
    mustCoverTokoh: [],
    mustCoverInstitusi: ["OJK"],
    mustCoverTopics: ["Fintech"],
  },
};

const prompt = buildSearchPrompt(testContext, testQueryResult);

// Check recency rules are present
assertContains(prompt, "INSTITUSI queries: LAST 24 HOURS", "prompt contains institusi 24h rule");
assertContains(prompt, "TOPIC queries: LAST 48 HOURS", "prompt contains topic 48h rule");
assertContains(prompt, "TOKOH queries: LAST 7 DAYS", "prompt contains tokoh 7 days rule");
assertContains(prompt, "RECENCY RULES BY TYPE", "prompt contains recency rules section");

// ============================================================================
// TEST 8: Error results are preserved in dedupe
// ============================================================================

console.log("\n=== Test 8: Error results preserved in dedupe ===\n");

const searchResultsWithError: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Article 1", url: "https://a.com/1", snippet: "Content", source: "News" },
    ],
  },
  {
    model: "Gemini",
    provider: "Google",
    layer: "search",
    articles: [],
    error: "API rate limit exceeded",
  },
];

const dedupedWithError = dedupeSearchResults(searchResultsWithError);

assertEqual(dedupedWithError.length, 2, "both results preserved");
assertEqual(dedupedWithError[1].error, "API rate limit exceeded", "error message preserved");

// ============================================================================
// TEST 9: Empty requirements produce no warnings
// ============================================================================

console.log("\n=== Test 9: Empty requirements produce no warnings ===\n");

const emptyRequirements: SearchQueryResult["requirements"] = {
  mustCoverTokoh: [],
  mustCoverInstitusi: [],
  mustCoverTopics: [],
};

const coverageEmpty = computeCoverage(searchResultsWithContent, emptyRequirements);

assertEqual(coverageEmpty.warnings.length, 0, "no warnings with empty requirements");
assertEqual(coverageEmpty.tokohMissing.length, 0, "no tokoh missing");
assertEqual(coverageEmpty.institusiMissing.length, 0, "no institusi missing");
assertEqual(coverageEmpty.topicsMissing.length, 0, "no topics missing");

// ============================================================================
// TEST 10: Partial topic word match
// ============================================================================

console.log("\n=== Test 10: Partial topic word match ===\n");

const searchResultsForTopicMatch: SearchResult[] = [
  {
    model: "Perplexity",
    provider: "Perplexity",
    layer: "search",
    articles: [
      { title: "Venture capital news", url: "https://a.com/1", snippet: "Latest startup investments", source: "News" },
    ],
  },
];

const requirementsMultiWord: SearchQueryResult["requirements"] = {
  mustCoverTokoh: [],
  mustCoverInstitusi: [],
  mustCoverTopics: ["Startup & Venture", "Pasar Modal"],
};

const coverageMultiWord = computeCoverage(searchResultsForTopicMatch, requirementsMultiWord);

assertEqual(coverageMultiWord.topicsCovered.length, 1, "1 topic covered via partial match");
assert(coverageMultiWord.topicsCovered.includes("Startup & Venture"), "Startup & Venture covered (startup word match)");
assertEqual(coverageMultiWord.topicsMissing.length, 1, "1 topic missing");
assert(coverageMultiWord.topicsMissing.includes("Pasar Modal"), "Pasar Modal missing");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(50));
console.log(`PHASE 1.2 TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

if (failed > 0) {
  process.exit(1);
}
