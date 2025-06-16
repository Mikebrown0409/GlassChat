import { NextRequest } from "next/server";
import { handleWebSocketUpgrade } from "~/server/ws/gateway";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const upgradeHeader = req.headers.get("upgrade");
  if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
    const { socket, head } = (req as any).nextInternals as {
      socket: any;
      head: Buffer;
    };
    handleWebSocketUpgrade(req as any, socket, head);
    return new Response(null, { status: 101 });
  }

  return new Response("WebSocket endpoint", { status: 200 });
}
