#!/usr/bin/env tsx

import { memoryManagerServer } from "~/lib/memory/memoryManager-server";

async function testMemorySystem() {
  console.log("🧪 Testing memory system...");

  const testChatId = `test-chat-${Date.now()}`;
  const testContent = "Hello, this is a test memory entry.";
  const testMetadata = { role: "user", timestamp: Date.now() };

  try {
    console.log("📝 Adding memory...");
    await memoryManagerServer.addMemory(testChatId, testContent, testMetadata);
    console.log("✅ Memory added successfully");

    console.log("🧠 Testing summarization...");
    const testHistory =
      "user: Hello\nassistant: Hi there!\nuser: How are you?\nassistant: I'm doing well, thanks!";
    const summary = await memoryManagerServer.summarizeAndStore(
      testChatId,
      testHistory,
    );
    console.log("✅ Summary generated:", summary);

    console.log("🎉 Memory system test completed successfully!");
  } catch (error) {
    console.error("❌ Memory system test failed:", error);
    process.exit(1);
  }
}

// Run the test
testMemorySystem().catch(console.error);
