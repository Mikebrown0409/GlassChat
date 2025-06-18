#!/usr/bin/env tsx

// Direct WebSocket connection test
// Run with: npx tsx scripts/test-websocket-direct.ts

import WebSocket from "ws";

async function testWebSocketConnection() {
  console.log("🔌 Testing WebSocket connection directly...");

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:3000/api/ws");

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket connection timeout"));
    }, 5000);

    ws.on("open", () => {
      console.log("✅ WebSocket connection established!");
      clearTimeout(timeout);

      // Send join message
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: "test-room-123",
        }),
      );
      console.log("📤 Sent join message");

      // Wait a bit then close
      setTimeout(() => {
        ws.close();
        resolve();
      }, 1000);
    });

    ws.on("message", (data) => {
      console.log(
        "📥 Received message:",
        data.toString().length > 100 ? "Binary data" : data.toString(),
      );
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error.message);
      clearTimeout(timeout);
      reject(error);
    });

    ws.on("close", (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} ${reason}`);
      clearTimeout(timeout);
      if (code !== 1000) {
        reject(new Error(`WebSocket closed with code ${code}: ${reason}`));
      }
    });
  });
}

async function main() {
  try {
    await testWebSocketConnection();
    console.log("🎉 WebSocket test passed!");
  } catch (error) {
    console.error("💥 WebSocket test failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
