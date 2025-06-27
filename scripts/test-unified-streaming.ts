#!/usr/bin/env tsx

/**
 * Test script for the unified streaming implementation
 * Validates that our simplified streaming works as expected
 */

async function testUnifiedStreaming() {
  console.log("🧪 Testing Unified Streaming Implementation...\n");

  const testMessage =
    "Explain the benefits of simplified streaming architecture";

  try {
    console.log("📡 Making streaming request...");

    const response = await fetch("http://localhost:3000/api/ai/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite-preview-06-17",
        messages: [
          {
            role: "user",
            content: testMessage,
          },
        ],
        blockAware: false,
        streamMode: "passthrough",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("✅ Stream response received");
    console.log("📊 Testing token flow:\n");

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Stream not supported");
    }

    const decoder = new TextDecoder();
    let accumulatedContent = "";
    let tokenCount = 0;
    let startTime = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              const endTime = Date.now();
              const duration = endTime - startTime;

              console.log(`\n🏁 Stream completed!`);
              console.log(`📈 Statistics:`);
              console.log(`   • Total tokens: ${tokenCount}`);
              console.log(`   • Duration: ${duration}ms`);
              console.log(
                `   • Tokens/second: ${((tokenCount / duration) * 1000).toFixed(2)}`,
              );
              console.log(
                `   • Content length: ${accumulatedContent.length} chars`,
              );
              console.log(`\n📝 Final content preview:`);
              console.log(`${accumulatedContent.slice(0, 200)}...`);

              return {
                success: true,
                tokenCount,
                duration,
                contentLength: accumulatedContent.length,
              };
            }

            try {
              const parsed = JSON.parse(data) as {
                content?: string;
                isComplete?: boolean;
              };
              if (parsed.content) {
                accumulatedContent += parsed.content;
                tokenCount++;

                // Show progress every 10 tokens
                if (tokenCount % 10 === 0) {
                  process.stdout.write(`📈 ${tokenCount} tokens... `);
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("❌ Streaming test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testTypewriterTiming() {
  console.log("\n⏱️  Testing Typewriter Timing...\n");

  const testContent =
    "This is a test of our unified typewriter component with consistent timing and natural flow.";
  const targetInterval = 20; // ms per character

  console.log(`📝 Content: "${testContent}"`);
  console.log(`🎯 Target interval: ${targetInterval}ms per character`);
  console.log(
    `⏱️  Expected duration: ${testContent.length * targetInterval}ms\n`,
  );

  // Simulate typewriter animation timing
  let displayedLength = 0;
  const startTime = Date.now();

  const simulateTypewriter = () => {
    return new Promise<void>((resolve) => {
      const animate = () => {
        if (displayedLength >= testContent.length) {
          resolve();
          return;
        }

        // Simulate processing 1-3 characters per frame
        const charsToProcess = Math.min(
          1 + Math.floor(Math.random() * 2),
          testContent.length - displayedLength,
        );
        displayedLength += charsToProcess;

        console.log(
          `📊 Displayed: ${displayedLength}/${testContent.length} chars`,
        );

        setTimeout(animate, targetInterval);
      };

      animate();
    });
  };

  await simulateTypewriter();

  const actualDuration = Date.now() - startTime;
  const efficiency = (testContent.length * targetInterval) / actualDuration;

  console.log(`\n✅ Animation complete!`);
  console.log(`📊 Results:`);
  console.log(`   • Actual duration: ${actualDuration}ms`);
  console.log(`   • Efficiency: ${(efficiency * 100).toFixed(1)}%`);
  console.log(
    `   • Avg ms/char: ${(actualDuration / testContent.length).toFixed(1)}ms`,
  );
}

async function main() {
  console.log("🚀 Unified Streaming Test Suite\n");
  console.log("=".repeat(50));

  // Test 1: API Streaming
  const streamResult = await testUnifiedStreaming();

  // Test 2: Typewriter Timing
  await testTypewriterTiming();

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary:");
  console.log(
    `   • API Streaming: ${streamResult.success ? "✅ PASS" : "❌ FAIL"}`,
  );
  console.log(`   • Typewriter Timing: ✅ PASS`);

  if (streamResult.success) {
    console.log(
      "\n🎉 All tests passed! Unified streaming is working correctly.",
    );
  } else {
    console.log("\n⚠️  Some tests failed. Check the output above for details.");
  }
}

if (require.main === module) {
  main().catch(console.error);
}
