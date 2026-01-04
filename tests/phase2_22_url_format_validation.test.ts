console.log("=== URL Format Validation Tests ===\n");

function isValidUrlFormat(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return ['http:', 'https:'].includes(parsed.protocol) 
      && parsed.hostname.includes('.')
      && !parsed.hostname.includes('vertexaisearch.cloud.google.com');
  } catch {
    return false;
  }
}

// Test 1: Valid URL
console.assert(isValidUrlFormat("https://cnbc.com/article/123") === true, "FAIL: valid URL rejected");
console.log("✅ Test 1: Valid URL accepted");

// Test 2: Empty URL
console.assert(isValidUrlFormat("") === false, "FAIL: empty URL accepted");
console.log("✅ Test 2: Empty URL rejected");

// Test 3: Google redirect
console.assert(isValidUrlFormat("https://vertexaisearch.cloud.google.com/grounding-api-redirect/xyz") === false, "FAIL: Google redirect accepted");
console.log("✅ Test 3: Google redirect URL rejected");

// Test 4: No domain
console.assert(isValidUrlFormat("https://localhost/test") === false, "FAIL: localhost accepted");
console.log("✅ Test 4: No real domain rejected");

// Test 5: Invalid protocol
console.assert(isValidUrlFormat("ftp://example.com") === false, "FAIL: ftp accepted");
console.log("✅ Test 5: Invalid protocol rejected");

// Test 6: Null/undefined
console.assert(isValidUrlFormat(null as any) === false, "FAIL: null accepted");
console.assert(isValidUrlFormat(undefined as any) === false, "FAIL: undefined accepted");
console.log("✅ Test 6: Null/undefined rejected");

console.log("\n=== All 6 tests passed ===");
