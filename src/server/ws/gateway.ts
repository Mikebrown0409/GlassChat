import WebSocket, { WebSocketServer } from "ws";
import * as Y from "yjs";

// In-memory map of roomId -> Y.Doc (will be replaced by Redis persistence later)
const docs = new Map<string, Y.Doc>();

interface ClientInfo {
  socket: WebSocket;
  roomId: string | null;
}

export function startCollaborationGateway(port = 4001) {
  const wss = new WebSocketServer({ port });
  console.log(`[CollabWS] WebSocket gateway listening on :${port}`);

  wss.on("connection", (socket: WebSocket) => {
    const client: ClientInfo = { socket, roomId: null };

    socket.on("message", (raw: WebSocket.RawData) => {
      // First message expected: { type: "join", roomId: string }
      // Otherwise binary Yjs update
      const isString = typeof raw === "string" || raw instanceof String;
      if (isString) {
        try {
          const msg = JSON.parse((raw as string | Buffer).toString());
          if (msg.type === "join" && typeof msg.roomId === "string") {
            client.roomId = msg.roomId;
            // @ts-ignore attach for easy lookup
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            socket._roomId = msg.roomId;
            const doc = getDoc(msg.roomId);
            // Send current state vector to client for sync
            const state = Y.encodeStateAsUpdate(doc);
            socket.send(state);
          }
        } catch {
          /* ignore malformed */
        }
        return;
      }

      // Binary data assumed Yjs update
      if (!client.roomId) return;
      const update = new Uint8Array(raw as ArrayBuffer);
      const doc = getDoc(client.roomId);
      // Apply and broadcast
      Y.applyUpdate(doc, update);
      broadcastUpdate(wss, client.roomId, socket, update);
    });

    socket.on("close", () => {
      // No special cleanup yet (docs persist in-memory)
    });
  });
}

function getDoc(roomId: string): Y.Doc {
  let d = docs.get(roomId);
  if (!d) {
    d = new Y.Doc();
    docs.set(roomId, d);
  }
  return d;
}

function broadcastUpdate(
  wss: WebSocketServer,
  roomId: string,
  origin: WebSocket,
  update: Uint8Array,
) {
  wss.clients.forEach((client: WebSocket) => {
    if (client === origin || client.readyState !== WebSocket.OPEN) return;
    // Simple room filter via stored property
    // @ts-ignore
    if (client._roomId === roomId) {
      client.send(update);
    }
  });
}
