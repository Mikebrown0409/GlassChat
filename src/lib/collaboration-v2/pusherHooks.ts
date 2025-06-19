import type { Channel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPusherClient } from "~/lib/pusher/client";
import type {
  CollaborationMessage,
  MessageSyncEvent,
  RoomStateEvent,
} from "./types";

interface UsePusherCollaborationProps {
  roomId?: string;
  _chatId?: string;
  userId?: string;
  onMessageSync?: (event: MessageSyncEvent) => void;
  onRoomStateUpdate?: (event: RoomStateEvent) => void;
}

export function usePusherCollaboration({
  roomId,
  _chatId,
  userId,
  onMessageSync,
  onRoomStateUpdate,
}: UsePusherCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const pusherRef = useRef(getPusherClient());

  // Keep latest callback references without re-subscribing every render
  const onMessageSyncRef = useRef<typeof onMessageSync | null>(null);
  const onRoomStateUpdateRef = useRef<typeof onRoomStateUpdate | null>(null);

  useEffect(() => {
    onMessageSyncRef.current = onMessageSync;
  }, [onMessageSync]);

  useEffect(() => {
    onRoomStateUpdateRef.current = onRoomStateUpdate;
  }, [onRoomStateUpdate]);

  // Connect to room channel
  useEffect(() => {
    if (!roomId || !userId) return;

    const pusher = pusherRef.current;

    // If Pusher is not available (missing credentials), skip collaboration
    if (!pusher) {
      console.log("⚠️ [Pusher] Skipping collaboration - Pusher not available");
      return;
    }

    const channelName = `room-${roomId}`;

    try {
      // Subscribe to room channel
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Set up event listeners
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`🟢 [Pusher] Connected to room: ${roomId}`);
        setIsConnected(true);
        setError(null);
      });

      channel.bind("pusher:subscription_error", (err: unknown) => {
        console.error(`🔴 [Pusher] Subscription error:`, err);
        setError("Failed to connect to collaboration room");
        setIsConnected(false);
      });

      // Collaboration events
      channel.bind("message-sync", (data: MessageSyncEvent) => {
        console.log(`📨 [Pusher] Message sync:`, data);
        onMessageSyncRef.current?.(data);
      });

      channel.bind("room-state-update", (data: RoomStateEvent) => {
        console.log(`🏠 [Pusher] Room state update:`, data);
        onRoomStateUpdateRef.current?.(data);
      });

      channel.bind(
        "user-joined",
        (data: { userId: string; timestamp: number }) => {
          console.log(`👋 [Pusher] User joined:`, data);
        },
      );

      channel.bind(
        "user-left",
        (data: { userId: string; timestamp: number }) => {
          console.log(`👋 [Pusher] User left:`, data);
        },
      );
    } catch (err) {
      console.error(`🔴 [Pusher] Connection error:`, err);
      setError("Failed to initialize Pusher connection");
      setIsConnected(false);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (channelRef.current) {
        console.log(`🔌 [Pusher] Unsubscribing from: ${channelName}`);
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [roomId, userId]);

  // Send collaboration message via API
  const sendMessage = useCallback(
    async (message: CollaborationMessage) => {
      if (!roomId || !isConnected || !pusherRef.current) {
        console.warn(
          "🚫 [Pusher] Cannot send message - not connected to room or Pusher unavailable",
        );
        return;
      }

      try {
        // Send message through API route which will trigger Pusher event
        const response = await fetch("/api/collaboration/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            message: message as unknown,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        console.log(`✅ [Pusher] Message sent successfully`);
      } catch (err: unknown) {
        console.error(`🔴 [Pusher] Send message error:`, err);
        setError("Failed to send collaboration message");
      }
    },
    [roomId, userId, isConnected],
  );

  // Join room
  const joinRoom = useCallback(
    async (newRoomId: string) => {
      if (!userId) {
        console.warn("🚫 [Pusher] Cannot join room - no user ID");
        return;
      }

      try {
        const response = await fetch("/api/collaboration/join-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: newRoomId,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to join room: ${response.statusText}`);
        }

        console.log(`✅ [Pusher] Joined room: ${newRoomId}`);
      } catch (err: unknown) {
        console.error(`🔴 [Pusher] Join room error:`, err);
        setError("Failed to join collaboration room");
      }
    },
    [userId],
  );

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!roomId || !userId) return;

    try {
      const response = await fetch("/api/collaboration/leave-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to leave room: ${response.statusText}`);
      }

      console.log(`✅ [Pusher] Left room: ${roomId}`);
    } catch (err: unknown) {
      console.error(`🔴 [Pusher] Leave room error:`, err);
    }
  }, [roomId, userId]);

  return {
    isConnected,
    error,
    sendMessage,
    joinRoom,
    leaveRoom,
  };
}
