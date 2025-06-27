#!/usr/bin/env npx tsx

/**
 * REAL Integration Test - Tests the actual running system
 * This hits the real API endpoint to see what's actually happening
 */

import { AIModel } from "../src/lib/ai/types";

console.log(
  "🔍 REAL Integration Test - Block Streaming vs Character Streaming",
);
console.log(
  "================================================================\n",
);

const testRealAPI = async () => {
  const testMessage = "How to reduce audio processing costs?";

  console.log("🧪 Testing BLOCK MODE (enableBlockMode: true)");
  console.log("===============================================");

  try {
    const response = await fetch("http://localhost:3001/api/ai/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AIModel.GEMINI_2_5_FLASH_LITE,
        messages: [{ role: "user", content: testMessage }],
        blockAware: true, // BLOCK MODE ON
        streamMode: "simple",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Stream not supported");
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;
    let blockChunks = 0;
    let characterChunks = 0;
    let totalContent = "";

    console.log("📡 Streaming chunks received:");
    console.log("-----------------------------");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            console.log("✅ Stream completed");
            break;
          }

          try {
            const parsed = JSON.parse(data);
            chunkCount++;

            if (parsed.block && parsed.blockId) {
              blockChunks++;
              console.log(`🧱 BLOCK CHUNK #${chunkCount}:`);
              console.log(`   Block ID: ${parsed.blockId}`);
              console.log(`   Block Type: ${parsed.block.type}`);
              console.log(
                `   Content Length: ${parsed.content?.length || 0} chars`,
              );
              console.log(
                `   Content Preview: "${(parsed.content || "").substring(0, 50)}..."`,
              );
              console.log(`   Has Block Data: ✅ YES`);
            } else {
              characterChunks++;
              console.log(`📝 CHARACTER CHUNK #${chunkCount}:`);
              console.log(`   Content: "${parsed.content || ""}"`);
              console.log(`   Has Block Data: ❌ NO`);
            }

            totalContent += parsed.content || "";
          } catch (e) {
            console.log(`⚠️  Invalid JSON: ${data}`);
          }
        }
      }
    }

    console.log("\n📊 BLOCK MODE Results:");
    console.log("======================");
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Block chunks: ${blockChunks}`);
    console.log(`Character chunks: ${characterChunks}`);
    console.log(`Content length: ${totalContent.length} chars`);
    console.log(`Block mode working: ${blockChunks > 0 ? "✅ YES" : "❌ NO"}`);

    if (blockChunks === 0) {
      console.log(
        "🚨 PROBLEM: No block chunks received! Block mode not working.",
      );
    }
  } catch (error) {
    console.error("❌ Block mode test failed:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  console.log("🧪 Testing LEGACY MODE (enableBlockMode: false)");
  console.log("================================================");

  try {
    const response = await fetch("http://localhost:3001/api/ai/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AIModel.GEMINI_2_5_FLASH_LITE,
        messages: [{ role: "user", content: testMessage }],
        blockAware: false, // BLOCK MODE OFF
        streamMode: "passthrough",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Stream not supported");
    }

    const decoder = new TextDecoder();
    let chunkCount = 0;
    let blockChunks = 0;
    let characterChunks = 0;
    let totalContent = "";

    console.log("📡 Streaming chunks received:");
    console.log("-----------------------------");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            console.log("✅ Stream completed");
            break;
          }

          try {
            const parsed = JSON.parse(data);
            chunkCount++;

            if (parsed.block && parsed.blockId) {
              blockChunks++;
              console.log(
                `🧱 BLOCK CHUNK #${chunkCount}: ${parsed.content?.substring(0, 30)}...`,
              );
            } else {
              characterChunks++;
              if (chunkCount <= 10 || chunkCount % 20 === 0) {
                console.log(
                  `📝 CHAR CHUNK #${chunkCount}: "${parsed.content || ""}"`,
                );
              }
            }

            totalContent += parsed.content || "";
          } catch (e) {
            console.log(`⚠️  Invalid JSON: ${data}`);
          }
        }
      }
    }

    console.log("\n📊 LEGACY MODE Results:");
    console.log("=======================");
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Block chunks: ${blockChunks}`);
    console.log(`Character chunks: ${characterChunks}`);
    console.log(`Content length: ${totalContent.length} chars`);
    console.log(
      `Legacy mode working: ${characterChunks > 0 ? "✅ YES" : "❌ NO"}`,
    );
  } catch (error) {
    console.error("❌ Legacy mode test failed:", error);
  }
};

// Test the real API
console.log("⚡ Starting real API test...");
console.log("Make sure the dev server is running on localhost:3000\n");

testRealAPI()
  .then(() => {
    console.log("\n🎯 Diagnosis:");
    console.log("==============");
    console.log(
      "• If Block Mode shows character chunks → Server not detecting blocks",
    );
    console.log(
      "• If Block Mode shows block chunks → Server working, client issue",
    );
    console.log(
      "• Check console logs in browser for BlockAwareTypewriter behavior",
    );
    console.log(
      "• Look for '[BlockAware] Streaming X server-side blocks' messages",
    );
  })
  .catch(console.error);
