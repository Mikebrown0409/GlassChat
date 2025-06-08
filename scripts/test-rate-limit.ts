#!/usr/bin/env tsx
// Rate Limit Test Script
// Tests 429 error handling and rate limiting behavior

import { rateLimiter } from "../src/lib/ai/rate-limiter";
import { AIProvider } from "../src/lib/ai/types";

async function testRateLimitExhaustion() {
  console.log("🔄 Testing Rate Limit Exhaustion...");

  // Reset rate limiter
  rateLimiter.reset();

  const provider = AIProvider.OPENAI;

  // Simulate many requests to exhaust rate limit
  for (let i = 0; i < 502; i++) {
    // Exceed the 500 requests per minute limit
    const result = await rateLimiter.checkRateLimit(provider, 100);

    if (!result.allowed) {
      console.log(`✅ Rate limit triggered after ${i} requests`);
      console.log(`   Retry after: ${result.retryAfter} seconds`);
      console.log(`   Requests remaining: ${result.info.requestsRemaining}`);
      console.log(`   Tokens remaining: ${result.info.tokensRemaining}`);
      break;
    }

    // Record the request
    rateLimiter.recordRequest(provider, 100);
  }

  // Test 429 response handling
  console.log("\n🔄 Testing 429 Response Handling...");
  const retryInfo = rateLimiter.handleRateLimitResponse(provider, "60");
  console.log(
    `✅ 429 handler returned retry after: ${retryInfo.retryAfter} seconds`,
  );
}

testRateLimitExhaustion().catch(console.error);
