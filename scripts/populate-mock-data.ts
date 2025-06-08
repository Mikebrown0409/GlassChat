#!/usr/bin/env tsx

/**
 * Script to populate the database with mock data for testing
 * This creates chats and 100 messages to test UI performance
 */

import { db } from "../src/lib/db";
import {
  generateMockMessages,
  mockChats,
  sampleMarkdownMessage,
  sampleCodeMessage,
} from "../src/lib/mockData";
import { SyncStatus } from "../src/lib/sync/types";

async function populateMockData() {
  console.log("🔄 Populating database with mock data...");

  try {
    // Clear existing data
    await db.chats.clear();
    await db.messages.clear();
    await db.users.clear();

    console.log("✅ Cleared existing data");

    // Add mock chats
    for (const chat of mockChats) {
      await db.chats.add(chat);
    }

    console.log(`✅ Added ${mockChats.length} mock chats`);

    // Add 100 messages to the first chat for performance testing
    const testChatId = mockChats[0]!.id;
    const messages = generateMockMessages(testChatId, 100);

    // Add some special messages with markdown content
    messages.push({
      id: "msg-markdown-1",
      chatId: testChatId,
      role: "assistant",
      content: sampleMarkdownMessage,
      createdAt: Date.now() - 30000,
      localId: "local-msg-markdown-1",
      lastModified: Date.now() - 30000,
      syncStatus: SyncStatus.SYNCED,
      version: 1,
      deviceId: "mock-device",
    });

    messages.push({
      id: "msg-code-1",
      chatId: testChatId,
      role: "assistant",
      content: sampleCodeMessage,
      createdAt: Date.now() - 15000,
      localId: "local-msg-code-1",
      lastModified: Date.now() - 15000,
      syncStatus: SyncStatus.SYNCED,
      version: 1,
      deviceId: "mock-device",
    });

    // Add all messages
    for (const message of messages) {
      await db.messages.add(message);
    }

    console.log(
      `✅ Added ${messages.length} mock messages to chat "${mockChats[0]!.title}"`,
    );

    // Add some messages to other chats
    const chat2Messages = generateMockMessages(mockChats[1]!.id, 25);
    const chat3Messages = generateMockMessages(mockChats[2]!.id, 15);

    for (const message of [...chat2Messages, ...chat3Messages]) {
      await db.messages.add(message);
    }

    console.log(
      `✅ Added ${chat2Messages.length} messages to "${mockChats[1]!.title}"`,
    );
    console.log(
      `✅ Added ${chat3Messages.length} messages to "${mockChats[2]!.title}"`,
    );

    // Summary
    const totalChats = await db.chats.count();
    const totalMessages = await db.messages.count();

    console.log("\n📊 Mock Data Summary:");
    console.log(`   Chats: ${totalChats}`);
    console.log(`   Messages: ${totalMessages}`);
    console.log(`   Test Chat (100+ messages): ${testChatId}`);

    console.log("\n🎯 Testing Scenarios Available:");
    console.log("   ✅ 100+ message rendering performance");
    console.log("   ✅ Markdown content with code blocks");
    console.log("   ✅ Multiple chat navigation");
    console.log("   ✅ Sync status indicators");
    console.log("   ✅ Real-time message updates");

    console.log("\n🚀 Ready for UI testing!");
  } catch (error) {
    console.error("❌ Failed to populate mock data:", error);
    process.exit(1);
  }
}

// Run the script
populateMockData()
  .then(() => {
    console.log("✨ Mock data population complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
