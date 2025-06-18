#!/usr/bin/env tsx

// Script to clean up duplicate test users from the collaboration system
// Run with: npx tsx scripts/cleanup-test-users.ts

import Redis from "ioredis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function cleanupTestUsers() {
  console.log("🧹 Starting test user cleanup...");

  let redis: Redis | null = null;

  try {
    // Connect to Redis
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

    console.log("📡 Connected to Redis");

    // Get all collaboration user keys
    const userKeys = await redis.keys("collab_user:*");
    console.log(`📊 Found ${userKeys.length} user keys`);

    if (userKeys.length === 0) {
      console.log("✅ No users found to cleanup");
      return;
    }

    const users = [];
    for (const key of userKeys) {
      try {
        const userData = await redis.hgetall(key);
        if (userData.name) {
          users.push({
            key,
            id: userData.id,
            name: userData.name,
            lastSeen: parseInt(userData.lastSeen || "0"),
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse user data for ${key}:`, error);
      }
    }

    console.log(`📋 Found ${users.length} valid users`);

    // Find test users (users with "test" in name or generic names)
    const testUsers = users.filter((user) => {
      const name = user.name.toLowerCase();
      return (
        name.includes("test") ||
        name.includes("user-") ||
        name === "user" ||
        name === "test user"
      );
    });

    console.log(`🎯 Found ${testUsers.length} test users to remove`);

    if (testUsers.length === 0) {
      console.log("✅ No test users found to cleanup");
      return;
    }

    // Remove test users
    let removedCount = 0;
    for (const testUser of testUsers) {
      try {
        await redis.del(testUser.key);
        console.log(`🗑️ Removed test user: ${testUser.name} (${testUser.id})`);
        removedCount++;
      } catch (error) {
        console.error(`❌ Failed to remove user ${testUser.name}:`, error);
      }
    }

    // Also clean up room participation data for test users
    const roomKeys = await redis.keys("collab_room:*");
    let roomsUpdated = 0;

    for (const roomKey of roomKeys) {
      try {
        const roomData = await redis.hgetall(roomKey);
        if (roomData.users) {
          const users = JSON.parse(roomData.users);
          const originalLength = users.length;

          // Filter out test users
          const filteredUsers = users.filter((user: any) => {
            const name = user.name.toLowerCase();
            return !(
              name.includes("test") ||
              name.includes("user-") ||
              name === "user" ||
              name === "test user"
            );
          });

          if (filteredUsers.length !== originalLength) {
            await redis.hset(roomKey, "users", JSON.stringify(filteredUsers));
            console.log(
              `🏠 Updated room ${roomKey}: removed ${originalLength - filteredUsers.length} test users`,
            );
            roomsUpdated++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to update room ${roomKey}:`, error);
      }
    }

    console.log(`✅ Cleanup complete:`);
    console.log(`   - Removed ${removedCount} test users`);
    console.log(`   - Updated ${roomsUpdated} rooms`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }
}

// Run the cleanup
cleanupTestUsers().catch(console.error);
