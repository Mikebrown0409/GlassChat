#!/usr/bin/env tsx

/**
 * Pusher Connection Test Script
 *
 * This script tests both server and client Pusher connections to ensure
 * real-time collaboration features work properly in your environment.
 */

// Load environment variables from .env.local and .env files
import { config } from "dotenv";
import { resolve } from "path";
import Pusher from "pusher";

// Load environment files in order of priority
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Get environment variables directly (without full env.js validation)
const pusherEnv = {
  PUSHER_APP_ID: process.env.PUSHER_APP_ID,
  PUSHER_KEY: process.env.PUSHER_KEY,
  PUSHER_SECRET: process.env.PUSHER_SECRET,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
  NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
  NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

function isPusherServerConfigured(): boolean {
  return !!(
    pusherEnv.PUSHER_APP_ID &&
    pusherEnv.PUSHER_KEY &&
    pusherEnv.PUSHER_SECRET &&
    pusherEnv.PUSHER_CLUSTER
  );
}

function getPusherServer(): Pusher | null {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
    pusherEnv;

  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    return null;
  }

  try {
    return new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  } catch (error) {
    console.error("❌ [Pusher] Failed to initialize server:", error);
    return null;
  }
}

async function testPusherConnection() {
  console.log("🔧 Testing Pusher Configuration\n");

  // Test environment variables
  console.log("📋 Environment Variables:");
  console.log(
    `  PUSHER_APP_ID: ${pusherEnv.PUSHER_APP_ID ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  PUSHER_KEY: ${pusherEnv.PUSHER_KEY ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  PUSHER_SECRET: ${pusherEnv.PUSHER_SECRET ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  PUSHER_CLUSTER: ${pusherEnv.PUSHER_CLUSTER ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  NEXT_PUBLIC_PUSHER_KEY: ${pusherEnv.NEXT_PUBLIC_PUSHER_KEY ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `  NEXT_PUBLIC_PUSHER_CLUSTER: ${pusherEnv.NEXT_PUBLIC_PUSHER_CLUSTER ? "✅ Set" : "❌ Missing"}\n`,
  );

  // Test server configuration
  console.log("🔧 Server Configuration:");
  const isServerConfigured = isPusherServerConfigured();
  console.log(
    `  Server configured: ${isServerConfigured ? "✅ Yes" : "❌ No"}\n`,
  );

  if (!isServerConfigured) {
    console.log(
      "❌ Server not configured. Please add all PUSHER_* variables to your .env.local file.\n",
    );
    console.log("Required variables:");
    console.log("  PUSHER_APP_ID=your-app-id");
    console.log("  PUSHER_KEY=your-key");
    console.log("  PUSHER_SECRET=your-secret");
    console.log("  PUSHER_CLUSTER=your-cluster");
    console.log("  NEXT_PUBLIC_PUSHER_KEY=your-key");
    console.log("  NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster");
    return;
  }

  // Check if client variables match server variables
  const keyMismatch = pusherEnv.PUSHER_KEY !== pusherEnv.NEXT_PUBLIC_PUSHER_KEY;
  const clusterMismatch =
    pusherEnv.PUSHER_CLUSTER !== pusherEnv.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (keyMismatch || clusterMismatch) {
    console.log("⚠️ Configuration Issues:");
    if (keyMismatch) {
      console.log(
        "  PUSHER_KEY and NEXT_PUBLIC_PUSHER_KEY should be the same value",
      );
    }
    if (clusterMismatch) {
      console.log(
        "  PUSHER_CLUSTER and NEXT_PUBLIC_PUSHER_CLUSTER should be the same value",
      );
    }
    console.log();
  }

  // Test server connection
  console.log("🔌 Testing Server Connection:");
  const pusherServer = getPusherServer();

  if (!pusherServer) {
    console.log("❌ Failed to initialize Pusher server");
    return;
  }

  try {
    // Test by getting channel info (this validates the connection)
    const testChannel = "test-channel";
    const result = await pusherServer.get({ path: `/channels/${testChannel}` });
    console.log("✅ Server connection successful");
    console.log(`  Response: ${JSON.stringify(result.body)}`);
  } catch (error) {
    console.log("❌ Server connection failed:");
    console.log(`  Error: ${error}`);
    if (error instanceof Error && error.message.includes("401")) {
      console.log(
        "  💡 This usually means invalid credentials. Check your Pusher app credentials.",
      );
    }
    return;
  }

  // Test triggering an event
  console.log("\n📤 Testing Event Triggering:");
  try {
    await pusherServer.trigger("test-room", "test-event", {
      message: "Test message from connection script",
      timestamp: Date.now(),
    });
    console.log("✅ Event triggering successful");
  } catch (error) {
    console.log("❌ Event triggering failed:");
    console.log(`  Error: ${error}`);
    return;
  }

  console.log(
    "\n🎉 All Pusher tests passed! Real-time collaboration should work properly.",
  );
  console.log("\n💡 Next steps:");
  console.log("  1. Start your development server: npm run dev");
  console.log("  2. Open two browser windows to test collaboration");
  console.log("  3. Use the collaboration toggle to create/join rooms");
}

// Handle errors gracefully
testPusherConnection().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
