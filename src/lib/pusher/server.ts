import Pusher from "pusher";

let pusher: Pusher | null = null;

export function getPusherServer(): Pusher {
  pusher ??= new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });
  return pusher;
}

// Helper function to trigger collaboration events
export async function triggerCollaborationEvent(
  roomId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusherServer = getPusherServer();
  await pusherServer.trigger(`room-${roomId}`, event, data);
}

// Helper function to trigger chat message events
export async function triggerChatEvent(
  chatId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusherServer = getPusherServer();
  await pusherServer.trigger(`chat-${chatId}`, event, data);
}
