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
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.addEventListener("open", () => {
      this.ws?.send(JSON.stringify({ type: "join", roomId: this.roomId }));
    });

    this.ws.addEventListener("message", (evt) => {
      if (typeof evt.data === "string") return; // expecting binary updates
      const update = new Uint8Array(evt.data as ArrayBuffer);
      Y.applyUpdate(this.doc, update);
    });

    // Sync local updates to server
    this.doc.on("update", (update: Uint8Array) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(update);
      }
    });
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
