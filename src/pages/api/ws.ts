import type { NextApiRequest, NextApiResponse } from "next";
import {
  handleWebSocketUpgrade,
  startCollaborationGateway,
} from "~/server/ws/gateway";

// Disable body parsing so we can access the raw upgrade request
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(
    `[WS] Request method: ${req.method}, upgrade header: ${req.headers.upgrade}, connection: ${req.headers.connection}`,
  );

  // Check for WebSocket upgrade request
  const isUpgrade =
    req.headers.upgrade?.toLowerCase() === "websocket" ||
    req.headers.connection?.toLowerCase().includes("upgrade");

  if (isUpgrade) {
    console.log("[WS] WebSocket upgrade detected, initializing gateway...");
    startCollaborationGateway(); // ensure singleton running

    try {
      handleWebSocketUpgrade(req as any, res.socket as any, Buffer.alloc(0));
      console.log("[WS] WebSocket upgrade handled successfully");
      // Important: do NOT call res.write / res.end
      return; // let Node keep the socket open
    } catch (error) {
      console.error("[WS] WebSocket upgrade failed:", error);
      res.status(500).json({ error: "WebSocket upgrade failed" });
      return;
    }
  }

  // Normal HTTP request
  console.log("[WS] Normal HTTP request, returning status");
  res.status(200).json({ status: "ok" });
}
