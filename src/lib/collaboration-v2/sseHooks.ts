/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

interface Options {
  roomId?: string;
  userId: string;
  onMessageSync?: (event: unknown) => void;
  onRoomStateUpdate?: (event: unknown) => void;
}

interface RoomMessage {
  id: string;
  sender: string;
  content: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface SSEMessage {
  type: string;
  payload?: unknown;
}

export function useSSECollaboration(options: Options) {
  const { roomId, userId, onMessageSync, onRoomStateUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasJoinedRoomRef = useRef<string | null>(null);

  const joinRoomMutation = api.collaborationV2.joinRoom.useMutation();
  const sendMessageMutation = api.collaborationV2.sendMessage.useMutation();

  // Store callbacks in refs to avoid effect re-runs when they change
  const onMessageSyncRef = useRef(onMessageSync);
  const onRoomStateUpdateRef = useRef(onRoomStateUpdate);

  // Update refs when callbacks change
  onMessageSyncRef.current = onMessageSync;
  onRoomStateUpdateRef.current = onRoomStateUpdate;

  // Establish SSE connection when roomId changes
  useEffect(() => {
    if (!roomId) return;

    // Only join room if we haven't already joined this specific room
    if (hasJoinedRoomRef.current !== roomId) {
      hasJoinedRoomRef.current = roomId;
      // Auto join room (fire and forget)
      void joinRoomMutation.mutate({ roomId, userName: userId });
    }

    const encodedId = encodeURIComponent(roomId);

    const es = new EventSource(
      `/api/collaboration/subscribe-room?roomId=${encodedId}`,
    );
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (evt) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(evt.data as string) as SSEMessage;
      } catch {
        return; // ignore malformed JSON
      }

      if (!parsed || typeof parsed !== "object") return;

      const { type, payload } = parsed as SSEMessage;

      switch (type) {
        case "message": {
          const p = payload as Record<string, unknown> | undefined;
          if (!p) break;
          const msg: RoomMessage =
            "message" in p && typeof p.message === "object"
              ? (p.message as RoomMessage)
              : (p as RoomMessage);

          onMessageSyncRef.current?.(msg);
          break;
        }
        case "participant_joined":
        case "participant_left":
          onRoomStateUpdateRef.current?.(payload);
          break;
        default:
          break;
      }
    };

    return () => {
      es.close();
      setIsConnected(false);
      // Reset join tracking when disconnecting
      hasJoinedRoomRef.current = null;
    };
  }, [roomId, userId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId) return;
      await sendMessageMutation.mutateAsync({
        roomId,
        participantName: userId,
        content,
      });
    },
    [roomId, userId, sendMessageMutation],
  );

  const joinRoom = useCallback(
    async (targetRoomId: string) => {
      return await joinRoomMutation.mutateAsync({
        roomId: targetRoomId,
        userName: userId,
      });
    },
    [joinRoomMutation, userId],
  );

  return {
    isConnected,
    sendMessage,
    joinRoom,
  };
}
