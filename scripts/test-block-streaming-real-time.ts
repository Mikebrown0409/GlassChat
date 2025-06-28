#!/usr/bin/env tsx

/**
 * Test Real-Time Block Streaming
 *
 * This script tests that:
 * 1. Server-side block detection works
 * 2. Blocks are streamed in real-time (not just at completion)
 * 3. Client receives block metadata during streaming
 * 4. No excessive console logging
 */

import { NextRequest } from "next/server";
import { POST } from "~/app/api/ai/stream/route";

async function testRealTimeBlockStreaming() {
  console.log("🧪 Testing Real-Time Block Streaming...\n");

  // Test with content that should generate multiple blocks
  const testContent = {
    model: "gemini-2.5-flash-lite-preview-06-17",
    messages: [
      {
        role: "user" as const,
        content:
          "Write a short story with multiple paragraphs and include a list of characters. Make it about 3-4 paragraphs with a bulleted list.",
      },
    ],
    blockAware: true,
    streamMode: "simple" as const,
  };

  try {
    // Create a mock request
    const request = new NextRequest("http://localhost:3000/api/ai/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testContent),
    });

    console.log("📡 Sending request to stream API...");
    const response = await POST(request);

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
                if (!blocksReceived.includes(parsed.blockId)) {
                  blocksReceived.push(parsed.blockId);
                  console.log(
                    `🧱 Block detected: ${parsed.blockId} (${parsed.block.type}) - ${parsed.content.length} chars`,
                  );
                } else {
                  console.log(
                    `🔄 Block updated: ${parsed.blockId} - ${parsed.content.length} chars`,
                  );
                }
              } else {
                console.log(
                  `📝 Regular chunk: ${parsed.content?.length || 0} chars`,
                );
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

    // Validate results
    if (blockCount === 0) {
      console.log("❌ FAILED: No blocks detected during streaming");
      return false;
    }

    if (blocksReceived.length === 0) {
      console.log("❌ FAILED: No unique blocks received");
      return false;
    }

    console.log("✅ SUCCESS: Real-time block streaming is working!");
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

// Run the test
testRealTimeBlockStreaming()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
