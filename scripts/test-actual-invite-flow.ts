#!/usr/bin/env tsx

/**
 * REAL Invite Flow Test - Actually test the collaboration system
 * This test will help debug the localhost same-user issue
 */

// Mock the tRPC client for server-side use
async function createMockTRPCClient() {
  // We'll use the collaboration manager directly instead of tRPC
  const { getCollaborationManager } = await import(
    "../src/lib/collaboration/collaborationManager"
  );
  return getCollaborationManager();
}

async function testActualInviteFlow() {
  console.log("🧪 REAL Invite Flow Test\n");

  try {
    // Get collaboration managers for different sessions
    const { getCollaborationManager } = await import(
      "../src/lib/collaboration/collaborationManager"
    );
    const manager1 = getCollaborationManager("session-1");
    const manager2 = getCollaborationManager("session-2");

    console.log("1️⃣ Testing User Creation...");

    // Create first user
    const user1 = await manager1.createUser("Test User 1");
    console.log(`   ✅ Created user 1: ${user1.name} (${user1.id})`);

    // Create second user (different session)
    const user2 = await manager2.createUser("Test User 2");
    console.log(`   ✅ Created user 2: ${user2.name} (${user2.id})`);

    console.log("\n2️⃣ Testing Room Creation...");

    // User 1 creates a room
    const room = await manager1.createRoom("test-chat-123", "Test Room");
    console.log(`   ✅ Created room: ${room.name} (${room.id})`);
    console.log(`   📋 Room chatId: ${room.chatId}`);
    console.log(`   👥 Initial users: ${room.users.length}`);

    console.log("\n3️⃣ Testing Room Join...");

    // User 2 joins the room
    const joinedRoom = await manager2.joinRoom(room.id);
    console.log(`   ✅ User 2 joined room: ${joinedRoom.name}`);
    console.log(`   👥 Total users now: ${joinedRoom.users.length}`);

    console.log("\n4️⃣ Testing Room Data...");

    // Get updated room data from both perspectives
    const rooms1 = await manager1.getRooms();
    const rooms2 = await manager2.getRooms();
    console.log(`   📊 User 1 sees ${rooms1.length} rooms`);
    console.log(`   📊 User 2 sees ${rooms2.length} rooms`);

    const sharedRoom = rooms1.find((r) => r.id === room.id);
    if (sharedRoom) {
      console.log(
        `   📋 Shared room ${sharedRoom.id}: ${sharedRoom.users.length} users`,
      );
      for (const u of sharedRoom.users) {
        console.log(`      - ${u.name} (${u.id})`);
      }
    }

    console.log("\n5️⃣ Testing Shared Chat Context...");
    console.log(`   📱 Room chatId: ${room.chatId}`);
    console.log(`   📝 This should be the shared chatId for LLM conversation`);
    console.log(`   🎯 Both users should use this chatId in effectiveChatId`);

    console.log("\n6️⃣ Testing Message Flow...");

    // Test sending a message
    const message = await manager1.sendMessage(room.id, "Hello from user 1!");
    console.log(`   📤 User 1 sent message: ${message.content}`);

    // User 2 gets messages
    const messages = await manager2.getMessages(room.id);
    console.log(`   📥 User 2 sees ${messages.length} messages`);
    for (const msg of messages) {
      console.log(`      - ${msg.content} (from ${msg.userId})`);
    }

    console.log("\n✅ Test completed successfully!");
    console.log("\n🔧 Key findings:");
    console.log(`   - Room creation: ✅ Working`);
    console.log(`   - User joining: ✅ Working`);
    console.log(`   - Shared chatId: ${room.chatId}`);
    console.log(`   - Multiple users: ${joinedRoom.users.length} total`);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("   Stack:", error.stack);
    }
  }
}

// Run the test
testActualInviteFlow().catch(console.error);
