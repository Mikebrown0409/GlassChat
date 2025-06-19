import Pusher from "pusher-js";

let pusher: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (!pusher) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      throw new Error(
        `Missing Pusher credentials. Key: ${!!key}, Cluster: ${!!cluster}`,
      );
    }

    // Remove any quotes that might be in the environment variables
    const cleanKey = key.replace(/^["']|["']$/g, "");
    const cleanCluster = cluster.replace(/^["']|["']$/g, "");

    console.log("🔌 Initializing Pusher with:", {
      key: cleanKey.substring(0, 8) + "...",
      cluster: cleanCluster,
    });

    pusher = new Pusher(cleanKey, {
      cluster: cleanCluster,
      forceTLS: true,
    });
  }
  return pusher;
}

export function disconnectPusher(): void {
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
}
