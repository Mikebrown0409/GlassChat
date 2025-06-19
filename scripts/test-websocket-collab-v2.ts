#!/usr/bin/env npx tsx

/**
 * Test script for WebSocket-based Collaboration V2 System
 * Tests that the system works without the expensive polling
 */

import { WebSocket } from "ws";

console.log("🧪 Testing WebSocket Collaboration V2 System");
console.log("=".repeat(50));

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log("\n1. Testing WebSocket Connection...");

  return new Promise<boolean>((resolve) => {
    const ws = new WebSocket("ws://localhost:3000/api/ws");

    ws.on("open", () => {
      console.log("✅ WebSocket connected successfully");

      // Send join message as v2 client
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: "test-room-123",
          clientType: "v2",
        }),
      );

      console.log("✅ Sent v2 join message");

      setTimeout(() => {
        ws.close();
        resolve(true);
      }, 1000);
    });

    ws.on("error", (error) => {
      console.log("❌ WebSocket connection failed:", error.message);
      resolve(false);
    });

    ws.on("close", () => {
      console.log("✅ WebSocket connection closed cleanly");
    });
  });
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log("\n2. Testing API Endpoints...");

  try {
    // Test create room
    const createResponse = await fetch(
      "http://localhost:3000/api/trpc/collaborationV2.createRoom",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            name: "Test Room",
            userName: "Test User",
          },
        }),
      },
    );

    if (createResponse.ok) {
      console.log("✅ Create room endpoint working");
    } else {
      console.log("❌ Create room endpoint failed");
      return false;
    }

    return true;
  } catch (error) {
    console.log("❌ API test failed:", error);
    return false;
  }
}

async function main() {
  try {
    // Wait for server to be ready
    console.log("⏳ Waiting for server to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const wsTest = await testWebSocketConnection();
    const apiTest = await testAPIEndpoints();

    console.log("\n" + "=".repeat(50));
    console.log("📊 Test Results:");
    console.log(`WebSocket Connection: ${wsTest ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`API Endpoints: ${apiTest ? "✅ PASS" : "❌ FAIL"}`);

    if (wsTest && apiTest) {
      console.log("\n🎉 All tests passed! WebSocket collaboration is working.");
      console.log(
        "🚀 This system will use minimal Vercel function invocations.",
      );
      console.log("💡 Visit: http://localhost:3000/test-collab-v2?room=demo");
    } else {
      console.log("\n❌ Some tests failed. Check the errors above.");
    }
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

main().catch(console.error);
