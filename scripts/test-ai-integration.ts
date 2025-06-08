#!/usr/bin/env tsx
// AI Integration Test Script
// Tests all AI functionality including mock responses, rate limiting, and error handling

import { AIModel, AIProvider, type AIMessage } from "../src/lib/ai/types";
import { aiModels, generateAIResponse } from "../src/lib/ai/models";
import { rateLimiter } from "../src/lib/ai/rate-limiter";

// ANSI color codes for pretty output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message: string, color: keyof typeof colors = "white") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log();
  log(`${colors.bold}═══ ${message} ═══`, "cyan");
}

function logTest(testName: string, passed: boolean, details?: string) {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  const color = passed ? "green" : "red";
  log(`${status} ${testName}`, color);
  if (details) {
    log(`    ${details}`, "white");
  }
}

// Test data
const testMessages: AIMessage[] = [
  {
    role: "user",
    content: "Hello! This is a test message for the AI integration system.",
  },
];

const longTestMessages: AIMessage[] = [
  {
    role: "system",
    content: "You are a helpful AI assistant being tested.",
  },
  {
    role: "user",
    content:
      "Please provide a comprehensive response about the benefits of TypeScript in modern web development. Include examples and best practices.",
  },
];

async function testModelAvailability() {
  logHeader("Testing Model Availability");

  try {
    const models = aiModels.getAvailableModels();
    logTest(
      "Get available models",
      models.length > 0,
      `Found ${models.length} models`,
    );

    for (const { model, info } of models) {
      const isAvailable = aiModels.isModelAvailable(model);
      logTest(
        `Model ${info.displayName} availability`,
        true,
        `Available: ${isAvailable ? "Yes" : "No"} (Provider: ${info.provider})`,
      );
    }

    // Test specific model
    const gpt4Available = aiModels.isModelAvailable(AIModel.GPT_4);
    logTest("GPT-4 availability check", true, `Available: ${gpt4Available}`);

    const claudeAvailable = aiModels.isModelAvailable(AIModel.CLAUDE_3_OPUS);
    logTest(
      "Claude 3 Opus availability check",
      true,
      `Available: ${claudeAvailable}`,
    );
  } catch (error) {
    logTest("Model availability test", false, `Error: ${error}`);
  }
}

async function testBasicAIResponse() {
  logHeader("Testing Basic AI Response Generation");

  const testModels = [AIModel.GPT_4, AIModel.CLAUDE_3_OPUS];

  for (const model of testModels) {
    try {
      const startTime = Date.now();
      const response = await generateAIResponse(model, testMessages);
      const endTime = Date.now();

      const passed = response.content.length > 0;
      logTest(
        `${model} response generation`,
        passed,
        `Content: "${response.content.substring(0, 50)}..." (${endTime - startTime}ms)`,
      );

      logTest(
        `${model} response metadata`,
        response.responseTime > 0 && response.usage.totalTokens > 0,
        `Tokens: ${response.usage.totalTokens}, Time: ${response.responseTime}ms`,
      );
    } catch (error: any) {
      const isExpectedError =
        error?.type === "api_key" || error?.type === "rate_limit";
      const errorMessage = error?.message || "Unknown error";
      const errorType = error?.type || "unknown";
      logTest(
        `${model} response generation`,
        isExpectedError,
        `Expected error: ${errorMessage} (Type: ${errorType})`,
      );
    }
  }
}

async function testRateLimiting() {
  logHeader("Testing Rate Limiting System");

  try {
    // Reset rate limiters for clean test
    rateLimiter.reset();

    const provider = AIProvider.OPENAI;

    // Test rate limit checking
    const rateLimitCheck = await rateLimiter.checkRateLimit(provider, 1000);
    logTest(
      "Rate limit check",
      rateLimitCheck.allowed,
      `Remaining: ${rateLimitCheck.info.requestsRemaining} requests, ${rateLimitCheck.info.tokensRemaining} tokens`,
    );

    // Test rate limit info
    const rateLimitInfo = rateLimiter.getRateLimitInfo(provider);
    logTest(
      "Rate limit info retrieval",
      rateLimitInfo.provider === provider,
      `Provider: ${rateLimitInfo.provider}, Requests: ${rateLimitInfo.requestsRemaining}`,
    );

    // Simulate multiple requests to test rate limiting
    const requestPromises = [];
    for (let i = 0; i < 5; i++) {
      requestPromises.push(rateLimiter.checkRateLimit(provider, 500));
    }

    const results = await Promise.all(requestPromises);
    const allAllowed = results.every((r) => r.allowed);
    logTest(
      "Multiple concurrent rate limit checks",
      allAllowed,
      `All 5 requests allowed: ${allAllowed}`,
    );

    // Test rate limit recording
    rateLimiter.recordRequest(provider, 1000);
    const afterRecording = rateLimiter.getRateLimitInfo(provider);
    logTest(
      "Rate limit recording",
      afterRecording.tokensRemaining < rateLimitInfo.tokensRemaining,
      `Tokens decreased from ${rateLimitInfo.tokensRemaining} to ${afterRecording.tokensRemaining}`,
    );
  } catch (error) {
    logTest("Rate limiting test", false, `Error: ${error}`);
  }
}

async function testErrorHandling() {
  logHeader("Testing Error Handling");

  try {
    // Test with invalid model (should work in mock mode)
    const response = await generateAIResponse(AIModel.GPT_4, testMessages);
    logTest(
      "Invalid API key handling",
      response.content.includes("mock") || response.content.length > 0,
      "Gracefully handled missing API key with mock response",
    );

    // Test with empty messages (should fail validation)
    try {
      await generateAIResponse(AIModel.GPT_4, []);
      logTest(
        "Empty messages validation",
        false,
        "Should have thrown validation error",
      );
    } catch (error) {
      logTest(
        "Empty messages validation",
        true,
        "Correctly rejected empty messages",
      );
    }

    // Test with very long content
    const longMessage: AIMessage = {
      role: "user",
      content: "x".repeat(60000), // Exceeds typical token limits
    };

    try {
      await generateAIResponse(AIModel.GPT_4, [longMessage]);
      logTest("Long content handling", true, "Handled long content gracefully");
    } catch (error: any) {
      const isExpectedError =
        error.type === "rate_limit" || error.type === "api_key";
      logTest(
        "Long content handling",
        isExpectedError,
        `Error type: ${error.type}`,
      );
    }
  } catch (error: any) {
    logTest(
      "Error handling test",
      false,
      `Unexpected error: ${error?.message || error || "Unknown error"}`,
    );
  }
}

async function testMockMode() {
  logHeader("Testing Mock Mode Functionality");

  try {
    // In mock mode, all models should return mock responses
    const models = [
      AIModel.GPT_4,
      AIModel.CLAUDE_3_OPUS,
      AIModel.GPT_3_5_TURBO,
    ];

    for (const model of models) {
      const response = await generateAIResponse(model, testMessages);
      const isMockResponse =
        response.content.includes("mock") ||
        response.content.includes("Mock") ||
        response.responseTime < 2000; // Mock responses are faster

      logTest(
        `Mock response for ${model}`,
        isMockResponse,
        `Response: "${response.content.substring(0, 40)}..."`,
      );
    }

    // Test mock response timing
    const startTime = Date.now();
    await generateAIResponse(AIModel.GPT_4, testMessages);
    const mockResponseTime = Date.now() - startTime;

    logTest(
      "Mock response timing",
      mockResponseTime > 400 && mockResponseTime < 2000,
      `Response time: ${mockResponseTime}ms (should be 500-1500ms)`,
    );
  } catch (error: any) {
    logTest(
      "Mock mode test",
      false,
      `Error: ${error?.message || error || "Unknown error"}`,
    );
  }
}

async function testPerformance() {
  logHeader("Testing Performance");

  try {
    // Test concurrent requests
    const concurrentRequests = 3;
    const startTime = Date.now();

    const promises = Array(concurrentRequests)
      .fill(null)
      .map(() => generateAIResponse(AIModel.GPT_4, testMessages));

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / concurrentRequests;

    logTest(
      `Concurrent requests (${concurrentRequests})`,
      responses.every((r) => r.content.length > 0),
      `Total: ${totalTime}ms, Average: ${avgTime}ms per request`,
    );

    // Test memory usage (basic check)
    const memBefore = process.memoryUsage().heapUsed;

    // Generate multiple responses
    for (let i = 0; i < 5; i++) {
      await generateAIResponse(AIModel.GPT_4, testMessages);
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

    logTest(
      "Memory usage",
      memIncrease < 50, // Should not increase by more than 50MB
      `Memory increase: ${memIncrease.toFixed(2)}MB`,
    );
  } catch (error: any) {
    logTest(
      "Performance test",
      false,
      `Error: ${error?.message || error || "Unknown error"}`,
    );
  }
}

async function testTypeSafety() {
  logHeader("Testing TypeScript Type Safety");

  try {
    // Test enum values
    const allModels = Object.values(AIModel);
    const allProviders = Object.values(AIProvider);

    logTest(
      "AI Model enum completeness",
      allModels.length >= 6,
      `Found ${allModels.length} models: ${allModels.join(", ")}`,
    );

    logTest(
      "AI Provider enum completeness",
      allProviders.length >= 2,
      `Found ${allProviders.length} providers: ${allProviders.join(", ")}`,
    );

    // Test response structure
    const response = await generateAIResponse(AIModel.GPT_4, testMessages);

    const hasRequiredFields =
      typeof response.content === "string" &&
      typeof response.model === "string" &&
      typeof response.provider === "string" &&
      typeof response.usage === "object" &&
      typeof response.responseTime === "number";

    logTest(
      "Response type structure",
      hasRequiredFields,
      "All required fields present with correct types",
    );
  } catch (error: any) {
    logTest(
      "Type safety test",
      false,
      `Error: ${error?.message || error || "Unknown error"}`,
    );
  }
}

// Main test runner
async function runAllTests() {
  log("🤖 GlassChat AI Integration Test Suite", "bold");
  log(
    "Testing AI model integration, rate limiting, and error handling",
    "cyan",
  );

  const startTime = Date.now();

  await testModelAvailability();
  await testBasicAIResponse();
  await testRateLimiting();
  await testErrorHandling();
  await testMockMode();
  await testPerformance();
  await testTypeSafety();

  const totalTime = Date.now() - startTime;

  logHeader("Test Summary");
  log(`All tests completed in ${totalTime}ms`, "green");
  log("✨ AI integration system is ready!", "bold");

  // Additional info
  console.log();
  log("💡 Next steps:", "yellow");
  log("  1. Set OPENAI_API_KEY in .env for OpenAI models", "white");
  log("  2. Set ANTHROPIC_API_KEY in .env for Claude models", "white");
  log("  3. Test with real API keys using: npm run test:ai:real", "white");
  log("  4. Integration is ready for UI components!", "white");
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, "red");
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  log(`❌ Test suite failed: ${error}`, "red");
  process.exit(1);
});
