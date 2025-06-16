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
  // We only care about WebSocket upgrade requests
  if (req.headers.upgrade !== "websocket") {
    res.status(200).json({ status: "ok" });
    return;
  }

  // Ensure the gateway singleton is initialised (for standalone mode)
  startCollaborationGateway();

  const socket = res.socket as any;
  // `head` is an empty buffer because Next hasn't read any extra bytes yet
  const head = Buffer.alloc(0);

  handleWebSocketUpgrade(req as any, socket, head);
}
