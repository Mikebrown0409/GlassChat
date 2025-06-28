/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/prefer-includes */

declare global {
  var __glasschat_room_bus:
    | Map<string, Set<(event: RoomEvent) => void>>
    | undefined;
}

export type RoomEvent = {
  type: string;
  roomId: string;
  payload?: Record<string, unknown>;
};

// Global singleton across the Vercel function instance
const listeners: Map<string, Set<(event: RoomEvent) => void>> = (
  globalThis as any
).__glasschat_room_bus || new Map();

if (!(globalThis as any).__glasschat_room_bus) {
  (globalThis as any).__glasschat_room_bus = listeners;
}

export function publishEvent(event: RoomEvent) {
  const set = listeners.get(event.roomId);
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb(event);
    } catch (err: any) {
      console.error("[roomBus] listener error", err);
      // Clean up listeners that cannot process events anymore
      if (
        err?.code === "ERR_INVALID_STATE" ||
        /Controller is already closed/.test(String(err))
      ) {
        set.delete(cb);
      }
    }
  }
}

export function subscribe(roomId: string, cb: (e: RoomEvent) => void) {
  let set = listeners.get(roomId);
  if (!set) {
    set = new Set();
    listeners.set(roomId, set);
  }
  set.add(cb);

  return () => {
    set?.delete(cb);
    if (set && set.size === 0) {
      listeners.delete(roomId);
    }
  };
}
