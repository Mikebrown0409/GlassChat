import Pusher from "pusher-js";
import { env } from "~/env";

let pusher: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  if (!pusher) {
    const key = env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn(
        `⚠️ Pusher credentials missing. Collaboration features disabled.`,
        `\nKey: ${!!key ? "configured" : "missing"}`,
        `\nCluster: ${!!cluster ? "configured" : "missing"}`,
        `\nTo enable collaboration, add NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER to your .env.local file`,
      );
      return null;
    }

    // Clean any potential quotes from environment variables
    const cleanKey = key.replace(/^["']|["']$/g, "");
    const cleanCluster = cluster.replace(/^["']|["']$/g, "");

    console.log("🔌 Initializing Pusher client:", {
      key:
        cleanKey.substring(0, 8) +
        "..." +
        cleanKey.substring(cleanKey.length - 4),
      cluster: cleanCluster,
      forceTLS: true,
      environment: process.env.NODE_ENV,
    });

    try {
      pusher = new Pusher(cleanKey, {
        cluster: cleanCluster,
        forceTLS: true,
        enabledTransports: ["ws", "wss"],
        // Add auth configuration for private channels if needed
        authEndpoint: "/api/pusher/auth",
        // Development debugging
        enableLogging: process.env.NODE_ENV === "development",
      });

      // Connection state logging for development
      if (process.env.NODE_ENV === "development") {
        pusher.connection.bind("connecting", () => {
          console.log("🔌 [Pusher] Connecting...");
        });

        pusher.connection.bind("connected", () => {
          console.log("✅ [Pusher] Connected successfully");
        });

        pusher.connection.bind("failed", () => {
          console.error("❌ [Pusher] Connection failed");
        });

        pusher.connection.bind("disconnected", () => {
          console.log("🔌 [Pusher] Disconnected");
        });

        pusher.connection.bind("error", (err: unknown) => {
          console.error("🔴 [Pusher] Connection error:", err);
        });
      }

      console.log("✅ [Pusher] Client initialized successfully");
    } catch (error) {
      console.error("❌ [Pusher] Failed to initialize client:", error);
      pusher = null;
    }
  }
  return pusher;
}

export function disconnectPusher(): void {
  if (pusher) {
    console.log("🔌 [Pusher] Disconnecting client");
    pusher.disconnect();
    pusher = null;
  }
}

// Helper to check if Pusher is properly configured
export function isPusherConfigured(): boolean {
  return !!(env.NEXT_PUBLIC_PUSHER_KEY && env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

// Helper to get connection state
export function getPusherConnectionState(): string | null {
  return pusher?.connection.state ?? null;
}
