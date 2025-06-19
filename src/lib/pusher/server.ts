import Pusher from "pusher";
import { env } from "~/env";

let pusher: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!pusher) {
    const appId = env.PUSHER_APP_ID;
    const key = env.PUSHER_KEY;
    const secret = env.PUSHER_SECRET;
    const cluster = env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      console.warn(
        `⚠️ [Pusher] Missing server credentials. Real-time features will be disabled.`,
        `\nAppId: ${!!appId ? "configured" : "missing"}`,
        `\nKey: ${!!key ? "configured" : "missing"}`,
        `\nSecret: ${!!secret ? "configured" : "missing"}`,
        `\nCluster: ${!!cluster ? "configured" : "missing"}`,
        `\nTo enable real-time collaboration, add all PUSHER_* variables to your .env.local file`,
      );
      return null;
    }

    // Clean any potential quotes from environment variables
    const cleanAppId = appId.replace(/^["']|["']$/g, "");
    const cleanKey = key.replace(/^["']|["']$/g, "");
    const cleanSecret = secret.replace(/^["']|["']$/g, "");
    const cleanCluster = cluster.replace(/^["']|["']$/g, "");

    console.log("🔧 Initializing Pusher server:", {
      appId: cleanAppId,
      key:
        cleanKey.substring(0, 8) +
        "..." +
        cleanKey.substring(cleanKey.length - 4),
      cluster: cleanCluster,
      environment: env.NODE_ENV,
    });

    try {
      pusher = new Pusher({
        appId: cleanAppId,
        key: cleanKey,
        secret: cleanSecret,
        cluster: cleanCluster,
        useTLS: true,
        // Add development configuration
        ...(env.NODE_ENV === "development" && {
          // Enable CORS for local development
          encrypted: true,
        }),
      });

      console.log("✅ [Pusher] Server initialized successfully");
    } catch (error) {
      console.error("❌ [Pusher] Failed to initialize server:", error);
      pusher = null;
    }
  }
  return pusher;
}

// Helper function to trigger collaboration events with better error handling
export async function triggerCollaborationEvent(
  roomId: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  const pusherServer = getPusherServer();
  if (!pusherServer) {
    console.warn("⚠️ [Pusher] Cannot trigger event - server not configured");
    return false;
  }

  try {
    console.log(`📤 [Pusher] Triggering event '${event}' for room: ${roomId}`);
    await pusherServer.trigger(`room-${roomId}`, event, data);
    console.log(`✅ [Pusher] Event '${event}' triggered successfully`);
    return true;
  } catch (error) {
    console.error(`❌ [Pusher] Failed to trigger event '${event}':`, error);
    // Don't throw - let the operation continue without real-time updates
    return false;
  }
}

// Helper function to trigger chat message events with better error handling
export async function triggerChatEvent(
  chatId: string,
  event: string,
  data: unknown,
): Promise<boolean> {
  const pusherServer = getPusherServer();
  if (!pusherServer) {
    console.warn(
      "⚠️ [Pusher] Cannot trigger chat event - server not configured",
    );
    return false;
  }

  try {
    console.log(
      `📤 [Pusher] Triggering chat event '${event}' for chat: ${chatId}`,
    );
    await pusherServer.trigger(`chat-${chatId}`, event, data);
    console.log(`✅ [Pusher] Chat event '${event}' triggered successfully`);
    return true;
  } catch (error) {
    console.error(
      `❌ [Pusher] Failed to trigger chat event '${event}':`,
      error,
    );
    // Don't throw - let the operation continue without real-time updates
    return false;
  }
}

// Helper to check if Pusher server is properly configured
export function isPusherServerConfigured(): boolean {
  return !!(
    env.PUSHER_APP_ID &&
    env.PUSHER_KEY &&
    env.PUSHER_SECRET &&
    env.PUSHER_CLUSTER
  );
}

// Helper to get channel info (useful for debugging)
export async function getChannelInfo(channelName: string): Promise<unknown> {
  const pusherServer = getPusherServer();
  if (!pusherServer) {
    console.warn("⚠️ [Pusher] Cannot get channel info - server not configured");
    return null;
  }

  try {
    return await pusherServer.get({ path: `/channels/${channelName}` });
  } catch (error) {
    console.error(
      `❌ [Pusher] Failed to get channel info for '${channelName}':`,
      error,
    );
    return null;
  }
}
