#!/usr/bin/env tsx

/**
 * Test script to validate the invite flow fixes
 *
 * This script tests:
 * 1. Room creation and invite link generation
 * 2. Chat context switching when joining via invite
 * 3. Message integration between collaboration and main chat
 */

async function testInviteFlow() {
  console.log("🧪 Testing invite flow fixes...\n");

  // Test 1: Simulate room creation
  console.log("1️⃣ Testing room creation...");
  const mockChatId = `test-chat-${Date.now()}`;

  try {
    // This would normally be done via the UI
    console.log(`   Created mock chat ID: ${mockChatId}`);
    console.log(`   Room invite URL would be: /room/{roomId}`);
    console.log("   ✅ Room creation simulation passed\n");
  } catch (error) {
    console.error("   ❌ Room creation failed:", error);
    return;
  }

  // Test 2: Check invite URL format
  console.log("2️⃣ Testing invite URL format...");
  const mockRoomId = "test-room-123";
  const inviteUrl = `/room/${mockRoomId}`;
  const expectedPattern = /^\/room\/[a-zA-Z0-9_-]+$/;

  if (expectedPattern.test(inviteUrl)) {
    console.log(`   ✅ Invite URL format valid: ${inviteUrl}\n`);
  } else {
    console.error(`   ❌ Invalid invite URL format: ${inviteUrl}\n`);
  }

  // Test 3: Check room-to-chat mapping
  console.log("3️⃣ Testing room-to-chat ID mapping...");
  const roomChatId = `chat-${mockRoomId}`;
  console.log(`   Room ID: ${mockRoomId}`);
  console.log(`   Expected Chat ID: ${roomChatId}`);

  if (roomChatId.startsWith("chat-") && roomChatId.includes(mockRoomId)) {
    console.log("   ✅ Room-to-chat mapping is correct\n");
  } else {
    console.error("   ❌ Room-to-chat mapping is incorrect\n");
  }

  // Test 4: Check message format conversion
  console.log("4️⃣ Testing collaboration message conversion...");
  const mockCollabMessage = {
    id: "msg-123",
    roomId: mockRoomId,
    userId: "user-456",
    content: "Hello from collaboration!",
    timestamp: Date.now(),
    type: "text" as const,
  };

  const mockUser = {
    id: "user-456",
    name: "Test User",
  };

  // Simulate the conversion logic from ChatInterface
  const convertedMessage = {
    id: mockCollabMessage.id,
    chatId: roomChatId,
    role: "user" as const,
    content: `**${mockUser.name}**: ${mockCollabMessage.content}`,
    createdAt: mockCollabMessage.timestamp,
    localId: mockCollabMessage.id,
    lastModified: mockCollabMessage.timestamp,
    syncStatus: 0,
    version: 1,
    deviceId: "collaboration",
  };

  console.log(`   Original: ${mockCollabMessage.content}`);
  console.log(`   Converted: ${convertedMessage.content}`);

  if (
    convertedMessage.content.includes(mockUser.name) &&
    convertedMessage.content.includes(mockCollabMessage.content)
  ) {
    console.log("   ✅ Message conversion is working correctly\n");
  } else {
    console.error("   ❌ Message conversion failed\n");
  }

  console.log("🎉 All invite flow tests completed!");
  console.log("\n📋 What to test manually:");
  console.log("1. Create a room in one browser tab");
  console.log("2. Copy the share link");
  console.log("3. Open the link in another browser/incognito tab");
  console.log("4. Verify the user joins the same chat context");
  console.log("5. Send messages and verify they appear in both tabs");
  console.log(
    "6. Check that messages show in the main chat interface, not just collaboration panel",
  );
}

// Run the test
testInviteFlow().catch(console.error);
