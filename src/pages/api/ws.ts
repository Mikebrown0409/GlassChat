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
  if (req.headers.upgrade === "websocket") {
    startCollaborationGateway(); // ensure singleton running
    handleWebSocketUpgrade(req as any, res.socket as any, Buffer.alloc(0));
    // Important: do NOT call res.write / res.end
    return; // let Node keep the socket open
  }
  // Normal HTTP request
  res.status(200).json({ status: "ok" });
}
