#!/usr/bin/env tsx

/**
 * Memory Cleanup Script
 *
 * This script performs intelligent cleanup of memory entries to prevent database bloat
 * and maintain optimal performance. It should be run periodically (e.g., daily) as a
 * scheduled job.
 *
 * Usage:
 *   npm run cleanup:memory
 *   or
 *   tsx scripts/cleanup-memory.ts
 */

import { memoryManagerServer } from "~/lib/memory/memoryManager-server";

async function main() {
  console.log("🧠 GlassChat Memory Cleanup Tool");
  console.log("================================");
  console.log("");

  try {
    // Perform global memory cleanup
    await memoryManagerServer.performGlobalMemoryCleanup();

    console.log("");
    console.log("✅ Memory cleanup completed successfully!");
    console.log("");
    console.log("📊 Cleanup Summary:");
    console.log("   • Removed memories older than 90 days");
    console.log("   • Limited each chat to 100 most recent memories");
    console.log("   • Updated summaries to reflect current state");
    console.log("   • Maintained database performance");
  } catch (error) {
    console.error("❌ Memory cleanup failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Cleanup interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Cleanup terminated");
  process.exit(0);
});

// Run the cleanup
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
