import Pusher from "pusher";

let pusher: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!pusher) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      console.warn(
        `Missing Pusher server credentials. AppId: ${!!appId}, Key: ${!!key}, Secret: ${!!secret}, Cluster: ${!!cluster}. Pusher features will be disabled.`,
      );
      return null;
    }

    // Remove any quotes that might be in the environment variables
    const cleanAppId = appId.replace(/^["']|["']$/g, "");
    const cleanKey = key.replace(/^["']|["']$/g, "");
    const cleanSecret = secret.replace(/^["']|["']$/g, "");
    const cleanCluster = cluster.replace(/^["']|["']$/g, "");

    console.log("🔧 Initializing Pusher server with:", {
      appId: cleanAppId,
      key: cleanKey.substring(0, 8) + "...",
      cluster: cleanCluster,
    });

    pusher = new Pusher({
      appId: cleanAppId,
      key: cleanKey,
      secret: cleanSecret,
      cluster: cleanCluster,
      useTLS: true,
    });
  }
  return pusher;
}

// Helper function to trigger collaboration events
export async function triggerCollaborationEvent(
  roomId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusherServer = getPusherServer();
  if (!pusherServer) {
    console.warn("Pusher not configured, skipping collaboration event trigger");
    return;
  }
  try {
    await pusherServer.trigger(`room-${roomId}`, event, data);
  } catch (error) {
    console.error("Failed to trigger Pusher event:", error);
    // Don't throw - let the operation continue without real-time updates
  }
}

// Helper function to trigger chat message events
export async function triggerChatEvent(
  chatId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusherServer = getPusherServer();
  if (!pusherServer) {
    console.warn("Pusher not configured, skipping chat event trigger");
    return;
  }
  try {
    await pusherServer.trigger(`chat-${chatId}`, event, data);
  } catch (error) {
    console.error("Failed to trigger Pusher event:", error);
    // Don't throw - let the operation continue without real-time updates
  }
}
