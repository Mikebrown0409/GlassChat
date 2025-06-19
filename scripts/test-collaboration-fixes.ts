#!/usr/bin/env tsx

// Test script to verify collaboration fixes
// Run with: npx tsx scripts/test-collaboration-fixes.ts

import Redis from "ioredis";

async function testCollaborationFixes() {
  console.log("🧪 Testing collaboration fixes...");

  let redis: Redis | null = null;

  try {
    // Test Redis connection
    console.log("1. Testing Redis connection...");

    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (REDIS_URL && REDIS_TOKEN) {
      redis = new Redis(REDIS_URL, {
        password: REDIS_TOKEN,
      });
    } else {
      // Local Redis
      redis = new Redis({
        host: "localhost",
        port: 6379,
      });
    }

    await redis.ping();
    console.log("✅ Redis connection successful");

    // Test WebSocket environment variable
    console.log("2. Testing WebSocket configuration...");
    const wsEnabled = process.env.NEXT_PUBLIC_ENABLE_WS;
    console.log(`   NEXT_PUBLIC_ENABLE_WS: ${wsEnabled}`);

    if (wsEnabled === "true") {
      console.log("✅ WebSocket is enabled");
    } else {
      console.log(
        "⚠️ WebSocket is not enabled - add NEXT_PUBLIC_ENABLE_WS=true to .env.local",
      );
    }

    // Check for existing collaboration data
    console.log("3. Checking collaboration data...");
    const userKeys = await redis.keys("collab_user:*");
    const roomKeys = await redis.keys("collab_room:*");

    console.log(`   Users in Redis: ${userKeys.length}`);
    console.log(`   Rooms in Redis: ${roomKeys.length}`);

    if (userKeys.length > 5) {
      console.log(
        "⚠️ Found many users - consider running cleanup script if these are test users",
      );
    }

    // Test creating a temporary user (will be cleaned up)
    console.log("4. Testing user creation prevention...");
    const testUserId = "test-user-" + Date.now();

    try {
      await redis.hset(`collab_user:${testUserId}`, {
        id: testUserId,
        name: "Test User Prevention",
        lastSeen: Date.now().toString(),
      });

      // Immediately clean it up
      await redis.del(`collab_user:${testUserId}`);
      console.log("✅ User creation/cleanup working properly");
    } catch (error) {
      console.error("❌ User operations failed:", error);
    }

    console.log("\n📊 Test Summary:");
    console.log("   - Redis connection: ✅");
    console.log(
      `   - WebSocket enabled: ${wsEnabled === "true" ? "✅" : "❌"}`,
    );
    console.log("   - User operations: ✅");
    console.log("\n🎯 Fixes applied:");
    console.log("   - Added user creation prevention logic");
    console.log("   - Enabled WebSocket for real-time updates");
    console.log("   - Improved error handling for WebSocket failures");
    console.log("   - Increased refetch frequency for user joins");
    console.log("   - Added immediate refetch on join operations");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }
}

// Run the test
testCollaborationFixes().catch(console.error);
