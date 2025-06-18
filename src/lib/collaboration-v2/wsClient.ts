interface RoomUpdate {
  type: "participant_joined" | "participant_left" | "message_sent";
  roomId: string;
  data: unknown;
}

export class CollaborationV2WSClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private onUpdateCallback: ((update: RoomUpdate) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced to fail fast in dev
  private isConnected = false;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect() {
    // Guard against server-side execution
    if (typeof window === "undefined") return;

    // Use the current window location to get the correct port
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host; // This includes the port
    const url = `${protocol}://${host}/api/ws`;

    console.log(`[CollabV2WS] Attempting to connect to: ${url}`);

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      // Set a connection timeout - if not connected in 3 seconds, fail fast
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.log("[CollabV2WS] Connection timeout - failing fast");
          this.ws.close();
          this.handleConnectionFailure();
        }
      }, 3000);

      this.ws.addEventListener("open", () => {
        console.log(`[CollabV2WS] Connected to room ${this.roomId}`);
        this.reconnectAttempts = 0;
        this.isConnected = true;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Join the room with v2 client type
        this.send({ type: "join", roomId: this.roomId, clientType: "v2" });
      });

      this.ws.addEventListener("message", (evt) => {
        if (typeof evt.data === "string") {
          try {
            const update: RoomUpdate = JSON.parse(evt.data) as RoomUpdate;
            if (this.onUpdateCallback) {
              this.onUpdateCallback(update);
            }
          } catch (error) {
            console.warn("[CollabV2WS] Failed to parse message:", error);
          }
        }
      });

      this.ws.addEventListener("error", (error) => {
        console.warn("[CollabV2WS] WebSocket error:", error);
        this.isConnected = false;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      });

      this.ws.addEventListener("close", (event) => {
        console.log(
          `[CollabV2WS] Connection closed (code: ${event.code}, reason: ${event.reason})`,
        );
        this.isConnected = false;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Only attempt reconnect if it wasn't a clean close (code 1000) and we haven't hit max attempts
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        } else {
          this.handleConnectionFailure();
        }
      });
    } catch (error) {
      console.warn("[CollabV2WS] Failed to create WebSocket:", error);
      this.handleConnectionFailure();
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * this.reconnectAttempts, 3000); // Max 3 second delay
    console.log(
      `[CollabV2WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );
    setTimeout(() => this.connect(), delay);
  }

  private handleConnectionFailure() {
    console.log(
      "[CollabV2WS] WebSocket unavailable - this is normal in development mode",
    );
    console.log("[CollabV2WS] Falling back to manual refresh mode");
    // In development, WebSocket often doesn't work, so this is expected
    // The UI will show manual refresh option instead
  }

  onUpdate(callback: (update: RoomUpdate) => void) {
    this.onUpdateCallback = callback;
  }

  send(message: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
    // Don't warn here - it's expected when WebSocket isn't available
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting"); // Clean close
      this.ws = null;
      this.isConnected = false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}
