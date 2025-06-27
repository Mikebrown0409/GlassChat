/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

interface Options {
  roomId?: string;
  userId: string;
  onMessageSync?: (event: unknown) => void;
  onRoomStateUpdate?: (event: unknown) => void;
}

export function useSSECollaboration(options: Options) {
  const { roomId, userId, onMessageSync, onRoomStateUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const joinRoomMutation = api.collaborationV2.joinRoom.useMutation();
  const sendMessageMutation = api.collaborationV2.sendMessage.useMutation();

  // Establish SSE connection when roomId changes
  useEffect(() => {
    if (!roomId) return;

    // Auto join room (fire and forget)
    void joinRoomMutation.mutate({ roomId, userName: userId });

    const es = new EventSource(
      `/api/collaboration/subscribe-room?roomId=${encodeURIComponent(roomId)}`,
    );
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        switch (data.type) {
          case "message": {
            const msg = data.payload?.message ?? data.payload;
            onMessageSync?.(msg);
            break;
          }
          case "participant_joined":
          case "participant_left":
            onRoomStateUpdate?.(data.payload);
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed
      }
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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

  const joinRoom = async (targetRoomId: string) => {
    return await joinRoomMutation.mutateAsync({
      roomId: targetRoomId,
      userName: userId,
    });
  };

  return {
    isConnected,
    sendMessage,
    joinRoom,
  };
}
