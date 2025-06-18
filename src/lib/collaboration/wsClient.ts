import * as Y from "yjs";

export class CollaborationWSClient {
  private ws: WebSocket | null = null;
  private readonly doc: Y.Doc;
  constructor(private roomId: string) {
    this.doc = new Y.Doc();
  }

  connect() {
    // Guard against server-side execution (location is undefined in Node)
    if (typeof window === "undefined") return;

    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.addEventListener("open", () => {
        console.log("WebSocket connected successfully");
        this.ws?.send(JSON.stringify({ type: "join", roomId: this.roomId }));
      });

      this.ws.addEventListener("message", (evt) => {
        if (typeof evt.data === "string") return; // expecting binary updates
        const update = new Uint8Array(evt.data as ArrayBuffer);
        Y.applyUpdate(this.doc, update);
      });

      this.ws.addEventListener("error", (error) => {
        console.warn("WebSocket connection error:", error);
        // Don't throw - gracefully degrade to HTTP-only mode
      });

      this.ws.addEventListener("close", () => {
        console.log("WebSocket connection closed");
        // Don't attempt to reconnect - let the hook handle it
      });

      // Sync local updates to server
      this.doc.on("update", (update: Uint8Array) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(update);
        }
      });
    } catch (error) {
      console.warn("Failed to create WebSocket connection:", error);
      // Gracefully degrade to HTTP-only mode
    }
  }

  getDocument() {
    return this.doc;
  }

  onUpdate(cb: (doc: Y.Doc) => void) {
    this.doc.on("update", () => cb(this.doc));
  }

  getText(name = "content") {
    return this.doc.getText(name);
  }
}
