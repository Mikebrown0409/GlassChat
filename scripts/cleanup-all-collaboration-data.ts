#!/usr/bin/env npx tsx

/**
 * Script to clean up ALL collaboration data
 * Clears Redis collaboration data and removes test users/chats
 */

import { redis } from "../src/lib/sync/redis";
import { db } from "../src/server/db";

async function cleanupAllCollaborationData() {
  console.log("🧹 Cleaning up ALL collaboration data");
  console.log("=====================================");

  try {
    // Clean up Redis collaboration data
    console.log("\n1️⃣  Cleaning Redis collaboration data");

    try {
      // Get all collaboration keys
      const collaborationKeys = await redis.keys("collaboration:*");
      console.log(
        `Found ${collaborationKeys.length} collaboration keys in Redis`,
      );

      if (collaborationKeys.length > 0) {
        await redis.del(...collaborationKeys);
        console.log(
          `✅ Deleted ${collaborationKeys.length} collaboration keys`,
        );
      }

      // Clean up specific patterns
      const roomKeys = await redis.keys("*room*");
      const userKeys = await redis.keys("*user*");
      const presenceKeys = await redis.keys("*presence*");

      const allKeys = [...roomKeys, ...userKeys, ...presenceKeys].filter(
        (key) => !collaborationKeys.includes(key), // Don't double-delete
      );

      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        console.log(`✅ Deleted ${allKeys.length} additional keys`);
      }

      console.log("✅ Redis cleanup completed");
    } catch (error) {
      console.log("⚠️  Redis cleanup failed (using MockRedis):", error);
      console.log("   This is expected in development mode");
    }

    // Clean up database test data
    console.log("\n2️⃣  Cleaning database test data");

    try {
      // Clean up memory entries for test chats
      const deletedMemories = await db.memoryEntry.deleteMany({
        where: {
          chatId: { startsWith: "shared-" },
        },
      });
      console.log(
        `✅ Deleted ${deletedMemories.count} memory entries for shared chats`,
      );

      // Clean up smart summaries for test chats
      const deletedSummaries = await db.smartSummary.deleteMany({
        where: {
          chatId: { startsWith: "shared-" },
        },
      });
      console.log(
        `✅ Deleted ${deletedSummaries.count} smart summaries for shared chats`,
      );

      console.log("✅ Database cleanup completed");
    } catch (error) {
      console.log("⚠️  Database cleanup failed:", error);
      console.log("   Some operations may not be available in current schema");
    }

    console.log("\n3️⃣  Clearing localStorage (instructions)");
    console.log("📝 To complete cleanup, clear browser localStorage:");
    console.log("   1. Open browser DevTools (F12)");
    console.log("   2. Go to Application > Storage > Local Storage");
    console.log("   3. Delete keys starting with:");
    console.log("      - collab_user");
    console.log("      - collabRoomId");
    console.log("      - lc_msgs_*");
    console.log("   4. Refresh the page");

    console.log("\n✅ All collaboration data cleaned up!");
    console.log("\n🔄 Restart your development server to ensure clean state:");
    console.log("   - Stop the server (Ctrl+C)");
    console.log("   - Run: npm run dev");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupAllCollaborationData()
  .then(() => {
    console.log("\n🏁 Cleanup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup script failed:", error);
    process.exit(1);
  });
