import Pusher from "pusher-js";

let pusher: Pusher | null = null;

export function getPusherClient(): Pusher {
  pusher ??= new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    forceTLS: true,
  });
  return pusher;
}

export function disconnectPusher(): void {
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
}
