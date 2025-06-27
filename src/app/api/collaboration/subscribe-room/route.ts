import type { NextRequest } from "next/server";
import { subscribe } from "~/server/events/roomBus";

export const runtime = "nodejs"; // Use Node to allow >25s connections

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return new Response("roomId required", { status: 400 });
  }

  let keepAlive: NodeJS.Timeout;
  let unsubscribeFn: () => void;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          closed = true;
          if (unsubscribeFn) unsubscribeFn();
        }
      };

      send({ type: "connected", roomId });

      unsubscribeFn = subscribe(roomId, (evt) => send(evt));

      keepAlive = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(":keepalive\n\n");
          } catch {
            // stream closed
          }
        }
      }, 15000);

      // provide cancel implementation via closure return
      return () => {
        closed = true;
        clearInterval(keepAlive);
        if (unsubscribeFn) unsubscribeFn();
      };
    },
    cancel() {
      closed = true;
      clearInterval(keepAlive);
      if (unsubscribeFn) unsubscribeFn();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
