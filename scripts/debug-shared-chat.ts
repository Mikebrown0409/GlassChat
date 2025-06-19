#!/usr/bin/env tsx

/**
 * Debug script to test shared chat behavior
 * This simulates what happens when users create and join rooms
 */

async function debugSharedChat() {
  console.log("🔍 Debugging Shared Chat Behavior\n");

  try {
    const { getCollaborationManager } = await import(
      "../src/lib/collaboration/collaborationManager"
    );

    // Simulate User 1 creating a room
    console.log("👤 User 1: Creating room...");
    const manager1 = getCollaborationManager("user1-session");
    const user1 = await manager1.createUser("User 1");
    const room = await manager1.createRoom("shared-chat-test", "Test Room");

    console.log(`✅ Room created:`, {
      roomId: room.id,
      chatId: room.chatId,
      name: room.name,
      users: room.users.length,
    });

    console.log(`🔗 Invite URL would be: /?room=${room.id}`);

    // Simulate User 2 joining via invite
    console.log("\n👤 User 2: Joining room via invite...");
    const manager2 = getCollaborationManager("user2-session");
    const user2 = await manager2.createUser("User 2");
    const joinedRoom = await manager2.joinRoom(room.id);

    console.log(`✅ Room joined:`, {
      roomId: joinedRoom.id,
      chatId: joinedRoom.chatId,
      name: joinedRoom.name,
      users: joinedRoom.users.length,
    });

    // Check if both users see the same room data
    console.log("\n🔍 Checking room consistency...");
    const user1Rooms = await manager1.getRooms();
    const user2Rooms = await manager2.getRooms();

    const user1Room = user1Rooms.find((r) => r.id === room.id);
    const user2Room = user2Rooms.find((r) => r.id === room.id);

    console.log("User 1 room data:", {
      chatId: user1Room?.chatId,
      users: user1Room?.users?.length,
    });

    console.log("User 2 room data:", {
      chatId: user2Room?.chatId,
      users: user2Room?.users?.length,
    });

    if (user1Room?.chatId === user2Room?.chatId) {
      console.log("✅ Both users have same chatId:", user1Room?.chatId);
    } else {
      console.log("❌ ChatId mismatch!");
    }

    console.log("\n🎯 Key findings:");
    console.log(`- Shared chatId: ${room.chatId}`);
    console.log(
      `- This should be used by effectiveChatId when users are in room ${room.id}`,
    );
    console.log(
      `- Both users should see messages sent to chatId: ${room.chatId}`,
    );
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugSharedChat().catch(console.error);
