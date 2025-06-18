import { parse } from "cookie";
import { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import * as Y from "yjs";
import type { WSV2Update } from "~/lib/collaboration-v2/types";

// Extend WebSocket interface to add custom properties
interface ExtendedWebSocket extends WebSocket {
  _clientType?: string;
}

// In-memory map of roomId -> Y.Doc (will be replaced by Redis persistence later)
const docs = new Map<string, Y.Doc>();

interface ClientInfo {
  socket: WebSocket;
  roomId: string | null;
  clientType: "yjs" | "v2"; // Track client type
}

let wss: WebSocketServer | null = null;

export function startCollaborationGateway() {
  if (wss) return wss;
  // Use noServer mode since we're handling upgrades manually
  wss = new WebSocketServer({ noServer: true });
  console.log(`[CollabWS] WebSocket gateway initialized (noServer mode)`);

  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    // Basic auth check: require NextAuth session cookie in production
    if (process.env.NODE_ENV === "production") {
      const cookies = parse(req.headers.cookie ?? "");
      const hasSession =
        cookies["next-auth.session-token"] ||
        cookies["__Secure-next-auth.session-token"];
      if (!hasSession) {
        socket.close();
        return;
      }
    }
    const client: ClientInfo = { socket, roomId: null, clientType: "yjs" };

    socket.on("message", (raw: WebSocket.RawData) => {
      // First message expected: { type: "join", roomId: string }
      // Otherwise binary Yjs update or v2 JSON messages
      const isString = typeof raw === "string" || raw instanceof String;
      if (isString) {
        try {
          const msg = JSON.parse((raw as string | Buffer).toString());
          if (msg.type === "join" && typeof msg.roomId === "string") {
            client.roomId = msg.roomId;

            // Detect client type based on message structure
            if (msg.clientType === "v2") {
              client.clientType = "v2";
              // @ts-ignore attach for easy lookup
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              socket._roomId = msg.roomId;
              (socket as ExtendedWebSocket)._clientType = "v2";
              console.log(`[CollabWS] V2 client joined room ${msg.roomId}`);
            } else {
              // Legacy Yjs client
              client.clientType = "yjs";
            // @ts-ignore attach for easy lookup
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            socket._roomId = msg.roomId;
            const doc = getDoc(msg.roomId);
            // Send current state vector to client for sync
            const state = Y.encodeStateAsUpdate(doc);
            socket.send(state);
            }
          } else if (client.clientType === "v2") {
            // Handle v2 collaboration messages
            handleV2Message(client, msg);
          }
        } catch {
          /* ignore malformed */
        }
        return;
      }

      // Binary data assumed Yjs update (only for yjs clients)
      if (!client.roomId || client.clientType !== "yjs") return;
      const update = new Uint8Array(raw as ArrayBuffer);
      const doc = getDoc(client.roomId);
      // Apply and broadcast
      Y.applyUpdate(doc, update);
      broadcastUpdate(client.roomId, socket, update);
    });

    socket.on("close", () => {
      // No special cleanup yet (docs persist in-memory)
    });
  });

  return wss;
}

function handleV2Message(client: ClientInfo, msg: any) {
  if (!client.roomId) return;

  // Broadcast to other v2 clients in the same room
  broadcastV2MessageInternal(client.roomId, client.socket, msg);
}

// Internal function with origin socket
function broadcastV2MessageInternal(
  roomId: string,
  origin: WebSocket,
  message: any,
) {
  getWSS().clients.forEach((client: WebSocket) => {
    if (client === origin || client.readyState !== WebSocket.OPEN) return;
    // @ts-ignore
    if (client._roomId === roomId && client._clientType === "v2") {
      client.send(JSON.stringify(message));
    }
  });
}

// Public function for external broadcasting (no origin to exclude)
export function broadcastV2Message(roomId: string, update: WSV2Update) {
  getWSS().clients.forEach((client: WebSocket) => {
    if (client.readyState !== WebSocket.OPEN) return;
    // @ts-ignore
    if (client._roomId === roomId && client._clientType === "v2") {
      client.send(JSON.stringify(update));
    }
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
  roomId: string,
  origin: WebSocket,
  update: Uint8Array,
) {
  getWSS().clients.forEach((client: WebSocket) => {
    if (client === origin || client.readyState !== WebSocket.OPEN) return;
    // Simple room filter via stored property
    // @ts-ignore
    if (client._roomId === roomId) {
      client.send(update);
    }
  });
}

function getWSS(): WebSocketServer {
  if (!wss) wss = new WebSocketServer({ noServer: true });
  return wss;
}

export function handleWebSocketUpgrade(
  req: IncomingMessage,
  socket: any,
  head: Buffer,
) {
  const server = getWSS();
  server.handleUpgrade(req, socket, head, (ws) => {
    server.emit("connection", ws, req);
  });
}

// Export for use in collaboration system
export const wsGateway = {
  broadcastV2Message,
  startCollaborationGateway,
  handleWebSocketUpgrade,
};
