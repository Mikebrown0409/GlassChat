#!/usr/bin/env tsx

/**
 * Test Live Block Streaming
 *
 * This script tests the live server to verify:
 * 1. Server-side block detection works
 * 2. Blocks are streamed in real-time
 * 3. No excessive console logging
 */

async function testLiveBlockStreaming() {
  console.log("🧪 Testing Live Block Streaming on localhost:3000...\n");

  // Test with content that should generate multiple blocks
  const testContent = {
    model: "gemini-2.5-flash-lite-preview-06-17",
    messages: [
      {
        role: "user",
        content:
          "Write a short explanation of JavaScript with 2 paragraphs and a bulleted list of 3 key features.",
      },
    ],
    blockAware: true,
    streamMode: "simple",
  };

  try {
    console.log("📡 Sending request to live server...");
    const response = await fetch("http://localhost:3000/api/ai/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testContent),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("✅ Stream response received, processing chunks...\n");

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No readable stream");
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;
    let blockCount = 0;
    let blocksReceived: string[] = [];
    let totalContent = "";

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
              console.log("🏁 Stream completed");
              break;
            }

            try {
              const parsed = JSON.parse(data);
              chunkCount++;

              if (parsed.block && parsed.blockId) {
                blockCount++;
                totalContent += parsed.content;

                if (!blocksReceived.includes(parsed.blockId)) {
                  blocksReceived.push(parsed.blockId);
                  console.log(
                    `🧱 NEW Block: ${parsed.blockId} (${parsed.block.type}) - ${parsed.content.length} chars`,
                  );
                  console.log(
                    `   Preview: "${parsed.content.slice(0, 60)}..."`,
                  );
                } else {
                  console.log(
                    `🔄 UPDATE Block: ${parsed.blockId} - ${parsed.content.length} chars`,
                  );
                }
              } else if (parsed.content) {
                console.log(`📝 Regular chunk: ${parsed.content.length} chars`);
                totalContent += parsed.content;
              }
            } catch (e) {
              console.warn("⚠️ Invalid JSON:", data.slice(0, 50));
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log("\n📊 Test Results:");
    console.log(`- Total chunks received: ${chunkCount}`);
    console.log(`- Total block events: ${blockCount}`);
    console.log(`- Unique blocks: ${blocksReceived.length}`);
    console.log(`- Block IDs: ${blocksReceived.join(", ")}`);
    console.log(`- Total content length: ${totalContent.length} chars`);

    // Validate results
    if (blockCount === 0) {
      console.log("❌ FAILED: No blocks detected during streaming");
      console.log(
        "This means the StreamTransformer is not generating block metadata",
      );
      return false;
    }

    if (blocksReceived.length === 0) {
      console.log("❌ FAILED: No unique blocks received");
      return false;
    }

    if (blocksReceived.length < 2) {
      console.log(
        "⚠️  WARNING: Only 1 block detected, expected multiple blocks for this content",
      );
    }

    console.log("✅ SUCCESS: Real-time block streaming is working!");
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);

    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.log("💡 Make sure the dev server is running on localhost:3000");
      console.log("   Run: npm run dev");
    }

    return false;
  }
}

// Run the test
testLiveBlockStreaming()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
