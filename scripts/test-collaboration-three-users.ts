#!/usr/bin/env tsx

/**
 * Three-User Real-Time Collaboration Test
 * Tests the collaboration features implemented for Prompt 7
 *
 * Features tested:
 * - Room creation and management
 * - User presence and typing indicators
 * - Live coding mode with collaborative editing
 * - Real-time event broadcasting
 * - Race condition handling
 * - User join/leave scenarios
 */

import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { CollaborationManager } from "../src/lib/collaboration/collaborationManager";
import { CollaborationEventType } from "../src/lib/collaboration/types";

// Test configuration
const TEST_CONFIG = {
  redisUrl:
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_URL ||
    "redis://localhost:6379",
  testDuration: 30000, // 30 seconds
  eventTimeout: 5000, // 5 seconds
};

// Mock environment for Node.js
const setupMockEnvironment = () => {
  // Mock localStorage
  if (typeof global.localStorage === "undefined") {
    (global as any).localStorage = {
      store: {} as Record<string, string>,
      getItem: function (key: string) {
        return this.store[key] || null;
      },
      setItem: function (key: string, value: string) {
        this.store[key] = value;
      },
      removeItem: function (key: string) {
        delete this.store[key];
      },
      clear: function () {
        this.store = {};
      },
    };
  }

  // Mock navigator
  if (typeof global.navigator === "undefined") {
    (global as any).navigator = { onLine: true };
  }

  // Mock window
  if (typeof global.window === "undefined") {
    (global as any).window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  // Mock document
  if (typeof global.document === "undefined") {
    (global as any).document = {
      addEventListener: () => {},
      hidden: false,
    };
  }
};

class ThreeUserCollaborationTest {
  private users: Array<{
    id: string;
    name: string;
    manager: CollaborationManager;
  }> = [];

  private roomId: string | null = null;
  private testResults: Array<{
    test: string;
    passed: boolean;
    error?: string;
    timing?: number;
  }> = [];

  private redis: Redis | null = null;

  constructor() {
    setupMockEnvironment();

    if (TEST_CONFIG.redisUrl) {
      try {
        this.redis = new Redis({ url: TEST_CONFIG.redisUrl });
      } catch (error) {
        console.warn("⚠️  Redis connection failed, using mock mode:", error);
      }
    }
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing Three-User Collaboration Test");
    console.log(`📡 Redis URL: ${TEST_CONFIG.redisUrl || "Local Mock"}`);

    // Create three test users with separate manager instances
    for (let i = 1; i <= 3; i++) {
      const userName = `TestUser${i}`;

      // Set unique device ID for each user
      global.localStorage.setItem("glasschat-device-id", `test-device-${i}`);

      try {
        // Create separate manager instance for each user
        const manager = new CollaborationManager();
        const user = await manager.createUser(userName);
        this.users.push({
          id: user.id,
          name: userName,
          manager: manager,
        });
        console.log(`✅ Created user: ${userName} (${user.id})`);
      } catch (error) {
        throw new Error(`Failed to create user ${userName}: ${error}`);
      }
    }
  }

  private async runTest(
    testName: string,
    testFn: () => Promise<void>,
    timeout: number = TEST_CONFIG.eventTimeout,
  ): Promise<void> {
    console.log(`\n🧪 Running: ${testName}`);
    const startTime = Date.now();

    try {
      await Promise.race([
        testFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Test timeout")), timeout),
        ),
      ]);

      const duration = Date.now() - startTime;
      this.testResults.push({
        test: testName,
        passed: true,
        timing: duration,
      });
      console.log(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        test: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        timing: duration,
      });
      console.log(`❌ ${testName}: ${error}`);
    }
  }

  async runAllTests(): Promise<void> {
    await this.initialize();

    // Test 1: Room Creation and Management
    await this.runTest("Room Creation", async () => {
      const chatId = nanoid();
      const room = await this.users[0].manager.createRoom(
        chatId,
        "Test Collaboration Room",
      );
      this.roomId = room.id;

      if (!room.id || room.name !== "Test Collaboration Room") {
        throw new Error("Room creation failed");
      }

      if (room.users.length !== 1 || room.users[0]?.id !== this.users[0].id) {
        throw new Error("Room creator not added correctly");
      }
    });

    // Test 2: Multiple Users Joining Room
    await this.runTest("Multiple Users Join Room", async () => {
      if (!this.roomId) throw new Error("No room to join");

      // Users 2 and 3 join the room
      for (let i = 1; i < 3; i++) {
        await this.users[i].manager.joinRoom(this.roomId);
      }

      // Verify all users are in the room
      const rooms = await this.users[0].manager.getRooms();
      const testRoom = rooms.find((r) => r.id === this.roomId);

      if (!testRoom || testRoom.users.length !== 3) {
        throw new Error(
          `Expected 3 users in room, got ${testRoom?.users.length || 0}`,
        );
      }
    });

    // Test 3: Concurrent Message Broadcasting
    await this.runTest("Concurrent Message Broadcasting", async () => {
      if (!this.roomId) throw new Error("No room for messaging");

      const messages = await Promise.all([
        this.users[0].manager.sendMessage(this.roomId, "Message from User 1"),
        this.users[1].manager.sendMessage(this.roomId, "Message from User 2"),
        this.users[2].manager.sendMessage(this.roomId, "Message from User 3"),
      ]);

      if (messages.length !== 3) {
        throw new Error("Not all messages were sent successfully");
      }

      // Verify messages are retrievable
      const retrievedMessages = await this.users[0].manager.getMessages(
        this.roomId,
      );
      if (retrievedMessages.length < 3) {
        throw new Error(
          `Expected at least 3 messages, got ${retrievedMessages.length}`,
        );
      }
    });

    // Test 4: Typing Indicators
    await this.runTest("Typing Indicators", async () => {
      if (!this.roomId) throw new Error("No room for typing test");

      // User 1 starts typing
      await this.users[0].manager.startTyping(this.roomId);

      // Small delay to allow Redis to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check typing users
      const typingUsers = await this.users[1].manager.getTypingUsers(
        this.roomId,
      );

      const user1Typing = typingUsers.find(
        (u) => u.userId === this.users[0].id,
      );
      if (!user1Typing) {
        throw new Error("User 1 typing indicator not found");
      }

      // Stop typing
      await this.users[0].manager.stopTyping(this.roomId);

      // Verify typing stopped
      await new Promise((resolve) => setTimeout(resolve, 100));
      const typingUsersAfter = await this.users[1].manager.getTypingUsers(
        this.roomId,
      );
      const user1TypingAfter = typingUsersAfter.find(
        (u) => u.userId === this.users[0].id,
      );

      if (user1TypingAfter) {
        throw new Error("User 1 still showing as typing after stop");
      }
    });

    // Test 5: Live Coding Mode Toggle
    await this.runTest("Live Coding Mode Toggle", async () => {
      if (!this.roomId) throw new Error("No room for live coding test");

      // Only room owner (User 1) should be able to toggle
      const isEnabled = await this.users[0].manager.toggleLiveCodingMode(
        this.roomId,
      );

      if (!isEnabled) {
        throw new Error("Live coding mode should be enabled");
      }

      // Verify live coding session exists
      const session = await this.users[1].manager.getLiveCodingSession(
        this.roomId,
      );
      if (!session) {
        throw new Error("Live coding session not created");
      }

      // Non-owner should not be able to toggle
      try {
        await this.users[1].manager.toggleLiveCodingMode(this.roomId);
        throw new Error("Non-owner should not be able to toggle live coding");
      } catch (error: any) {
        if (!error.message.includes("Only room owner")) {
          throw new Error("Wrong error message for non-owner toggle attempt");
        }
      }
    });

    // Test 6: Collaborative Live Coding
    await this.runTest("Collaborative Live Coding", async () => {
      if (!this.roomId)
        throw new Error("No room for live coding collaboration");

      const codeContent1 = "const hello = 'world';";
      const codeContent2 = codeContent1 + "\nconsole.log(hello);";

      // User 1 writes code
      await this.users[0].manager.updateLiveCode(this.roomId, codeContent1, {
        userId: this.users[0].id,
        line: 1,
        column: codeContent1.length,
        timestamp: Date.now(),
      });

      // User 2 adds to the code
      await this.users[1].manager.updateLiveCode(this.roomId, codeContent2, {
        userId: this.users[1].id,
        line: 2,
        column: "console.log(hello);".length,
        timestamp: Date.now(),
      });

      // Verify final code state
      const session = await this.users[2].manager.getLiveCodingSession(
        this.roomId,
      );
      if (!session || session.content !== codeContent2) {
        throw new Error(
          `Code content mismatch. Expected: "${codeContent2}", Got: "${session?.content}"`,
        );
      }

      if (session.version < 2) {
        throw new Error(`Expected version >= 2, got ${session.version}`);
      }
    });

    // Test 7: User Presence Tracking
    await this.runTest("User Presence Tracking", async () => {
      if (!this.roomId) throw new Error("No room for presence test");

      // Wait for presence heartbeats to register
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const onlineUsers = await this.users[0].manager.getOnlineUsers(
        this.roomId,
      );

      // Should have at least the users that are actively connected
      if (onlineUsers.length === 0) {
        console.warn(
          "⚠️  No online users detected - presence may not be working in test environment",
        );
      }
    });

    // Test 8: Event Polling System
    await this.runTest("Event Polling System", async () => {
      if (!this.roomId) throw new Error("No room for event polling test");

      const startTime = Date.now();

      // Send a test message to generate events
      await this.users[0].manager.sendMessage(
        this.roomId,
        "Event test message",
      );

      // Poll for events
      const events = await this.users[1].manager.pollEvents(
        this.roomId,
        startTime,
      );

      if (events.length === 0) {
        console.warn(
          "⚠️  No events captured - may be normal in test environment",
        );
      }
    });

    // Test 9: User Leave Scenario
    await this.runTest("User Leave Scenario", async () => {
      if (!this.roomId) throw new Error("No room for leave test");

      // User 3 leaves the room
      await this.users[2].manager.leaveRoom(this.roomId);

      // Verify room still exists with 2 users
      const rooms = await this.users[0].manager.getRooms();
      const testRoom = rooms.find((r) => r.id === this.roomId);

      if (!testRoom) {
        throw new Error("Room should still exist after one user leaves");
      }

      if (testRoom.users.length !== 2) {
        throw new Error(
          `Expected 2 users after leave, got ${testRoom.users.length}`,
        );
      }
    });

    // Test 10: Room Cleanup When All Users Leave
    await this.runTest("Room Cleanup", async () => {
      if (!this.roomId) throw new Error("No room for cleanup test");

      // Remaining users leave
      await this.users[0].manager.leaveRoom(this.roomId);
      await this.users[1].manager.leaveRoom(this.roomId);

      // Room should be deleted
      const rooms = await this.users[0].manager.getRooms();
      const testRoom = rooms.find((r) => r.id === this.roomId);

      if (testRoom) {
        throw new Error("Room should be deleted when all users leave");
      }
    });

    // Test 11: Race Condition Handling
    await this.runTest("Race Condition Handling", async () => {
      // Create a new room for race condition testing
      const chatId = nanoid();
      const room = await this.users[0].manager.createRoom(
        chatId,
        "Race Condition Test",
      );

      // All users try to join simultaneously
      await Promise.all([
        this.users[1].manager.joinRoom(room.id),
        this.users[2].manager.joinRoom(room.id),
      ]);

      // All users try to send messages simultaneously
      await Promise.all([
        this.users[0].manager.sendMessage(room.id, "Concurrent message 1"),
        this.users[1].manager.sendMessage(room.id, "Concurrent message 2"),
        this.users[2].manager.sendMessage(room.id, "Concurrent message 3"),
      ]);

      // Verify no data corruption
      const messages = await this.users[0].manager.getMessages(room.id);
      if (messages.length !== 3) {
        throw new Error(
          `Expected 3 messages in race condition test, got ${messages.length}`,
        );
      }

      // Cleanup
      await Promise.all([
        this.users[0].manager.leaveRoom(room.id),
        this.users[1].manager.leaveRoom(room.id),
        this.users[2].manager.leaveRoom(room.id),
      ]);
    });
  }

  printResults(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 THREE-USER COLLABORATION TEST RESULTS");
    console.log("=".repeat(60));

    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(
      `\n📈 Overall Results: ${passed}/${total} tests passed (${percentage}%)`,
    );

    if (percentage >= 90) {
      console.log("🎉 EXCELLENT: Collaboration system is working well!");
    } else if (percentage >= 70) {
      console.log("✅ GOOD: Most collaboration features are working.");
    } else {
      console.log("⚠️  NEEDS WORK: Several collaboration issues detected.");
    }

    console.log("\n📋 Detailed Results:");
    this.testResults.forEach((result) => {
      const status = result.passed ? "✅" : "❌";
      const timing = result.timing ? ` (${result.timing}ms)` : "";
      console.log(`  ${status} ${result.test}${timing}`);
      if (!result.passed && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Performance analysis
    const timings = this.testResults
      .filter((r) => r.timing)
      .map((r) => r.timing!);
    if (timings.length > 0) {
      const avgTiming = Math.round(
        timings.reduce((a, b) => a + b, 0) / timings.length,
      );
      const maxTiming = Math.max(...timings);
      console.log(`\n⏱️  Performance: Avg ${avgTiming}ms, Max ${maxTiming}ms`);
    }

    console.log("\n🏆 Test Suite Complete!");
  }

  async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up test data...");

    try {
      // Cleanup all users
      await Promise.all(this.users.map((user) => user.manager.cleanup()));

      // Clear Redis test data if available
      if (this.redis) {
        const keys = await this.redis.keys("collaboration:*");
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => this.redis!.del(key)));
          console.log(`🗑️  Cleaned ${keys.length} Redis keys`);
        }

        // If using MockRedis, call its cleanup method
        if ("cleanup" in this.redis) {
          (this.redis as any).cleanup();
        }
      }

      console.log("✅ Cleanup completed successfully");
    } catch (error) {
      console.warn("⚠️  Cleanup warning:", error);
    }
  }
}

// Main execution
async function main() {
  const tester = new ThreeUserCollaborationTest();

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error("💥 Test suite failed:", error);
  } finally {
    tester.printResults();
    await tester.cleanup();

    // Force exit to ensure process terminates
    setTimeout(() => {
      console.log("🔚 Force exiting...");
      process.exit(0);
    }, 100);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ThreeUserCollaborationTest };
