// Simple Collaboration Hook
// Minimal state management for room collaboration

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { CollaborationV2WSClient } from "./wsClient";

export function useCollaboration(
  roomId: string | null,
  participantName: string | null,
) {
  const queryClient = useQueryClient();
  const wsClientRef = useRef<CollaborationV2WSClient | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Join room mutation
  const joinRoomMutation = api.collaborationV2.joinRoom.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        console.log("[CollabV2] Successfully joined room");
        setHasAttemptedJoin(true); // Prevent further join attempts
        // Refresh the room data to show the new participant
        queryClient.invalidateQueries({
          queryKey: ["collaborationV2", "room", roomId],
        });
      } else {
        console.error("[CollabV2] Join failed:", data.error);
      }
    },
    onError: (error) => {
      console.error("[CollabV2] Join error:", error);
      setHasAttemptedJoin(true); // Prevent retries on error
    },
  });

  // Room data query - NO auto-polling, manual refresh only
  const roomQuery = api.collaborationV2.getRoom.useQuery(
    { roomId: roomId! },
    {
      enabled: !!roomId && hasAttemptedJoin,
      staleTime: Infinity, // Never auto-refetch - manual refresh only
      refetchOnWindowFocus: false, // No auto-refresh
    },
  );

  // Messages query - NO auto-polling, manual refresh only
  const messagesQuery = api.collaborationV2.getMessages.useQuery(
    { roomId: roomId! },
    {
      enabled: !!roomId && hasAttemptedJoin,
      staleTime: Infinity, // Never auto-refetch - manual refresh only
      refetchOnWindowFocus: false, // No auto-refresh
    },
  );

  // Send message mutation
  const sendMessageMutation = api.collaborationV2.sendMessage.useMutation({
    onSuccess: (data) => {
      // Always refresh messages after sending
      queryClient.invalidateQueries({
        queryKey: ["collaborationV2", "messages", roomId],
      });

      // If WebSocket is not connected, also refresh room data (in case of new participants)
      if (!isWebSocketConnected) {
        console.log(
          "[CollabV2] Message sent successfully, refreshing data for other updates",
        );
        queryClient.invalidateQueries({
          queryKey: ["collaborationV2", "room", roomId],
        });
      }
    },
  });

  // Send message to AI mutation
  const sendMessageToAIMutation =
    api.collaborationV2.sendMessageToAI.useMutation({
      onSuccess: (data) => {
        // Always refresh messages after AI response
        queryClient.invalidateQueries({
          queryKey: ["collaborationV2", "messages", roomId],
        });

        // If WebSocket is not connected, also refresh room data
        if (!isWebSocketConnected) {
          console.log(
            "[CollabV2] AI message sent successfully, refreshing data for other updates",
          );
          queryClient.invalidateQueries({
            queryKey: ["collaborationV2", "room", roomId],
          });
        }
      },
    });

  // Manual refresh function - this is the ONLY way data refreshes when WebSocket is down
  const refreshData = useCallback(() => {
    if (!roomId || !hasAttemptedJoin) return;

    void roomQuery.refetch();
    void messagesQuery.refetch();
  }, [roomId, hasAttemptedJoin, roomQuery, messagesQuery]);

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (!roomId || !participantName) return;

    // Initialize WebSocket client
    wsClientRef.current = new CollaborationV2WSClient(roomId);

    wsClientRef.current.onUpdate((update) => {
      console.log("[CollabV2] Received WebSocket update:", update);
      setIsWebSocketConnected(true);

      // Update queries based on the update type
      if (
        update.type === "participant_joined" ||
        update.type === "participant_left"
      ) {
        queryClient.invalidateQueries({
          queryKey: ["collaborationV2", "room", roomId],
        });
      } else if (update.type === "message_sent") {
        queryClient.invalidateQueries({
          queryKey: ["collaborationV2", "messages", roomId],
        });
      }
    });

    wsClientRef.current.connect();

    // Check WebSocket connection status
    const checkConnection = () => {
      if (wsClientRef.current) {
        const wasConnected = isWebSocketConnected;
        const isConnected = wsClientRef.current.isWebSocketConnected();

        if (wasConnected !== isConnected) {
          console.log(
            "[CollabV2] WebSocket connection status changed:",
            isConnected ? "Connected" : "Disconnected",
          );
          setIsWebSocketConnected(isConnected);

          // When WebSocket fails, do one manual refresh and then rely on manual-only
          if (!isConnected && wasConnected) {
            console.log(
              "[CollabV2] Lost WebSocket connection, doing final refresh then switching to manual-only mode",
            );
            refreshData();
          }
        } else {
          setIsWebSocketConnected(isConnected);
        }
      }
    };

    const connectionCheckInterval = setInterval(checkConnection, 2000);

    return () => {
      clearInterval(connectionCheckInterval);
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [roomId, participantName, queryClient, isWebSocketConnected]);

  // Auto-join room when component mounts (only once)
  const joinRoom = useCallback(async () => {
    if (!roomId || !participantName || hasAttemptedJoin) return;

    void joinRoomMutation.mutateAsync({ roomId, userName: participantName });
    setHasAttemptedJoin(true);
  }, [roomId, participantName, hasAttemptedJoin, joinRoomMutation]);

  // Reset join attempt when room or participant changes
  useEffect(() => {
    setHasAttemptedJoin(false);
  }, [roomId, participantName]);

  // Helper function to send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !participantName) return;

      try {
        const result = await sendMessageMutation.mutateAsync({
          roomId,
          content,
          participantName, // Fixed to match server expectation
        });

        // Refresh data after sending
        void roomQuery.refetch();
        void messagesQuery.refetch();

        return result;
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [roomId, participantName, sendMessageMutation, roomQuery, messagesQuery],
  );

  // Helper function to send message to AI
  const sendMessageToAI = useCallback(
    async (content: string) => {
      if (!roomId) {
        console.error("Cannot send AI message: no roomId");
        return;
      }

      if (!participantName) {
        console.error("Cannot send AI message: no participantName");
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const result = await sendMessageToAIMutation.mutateAsync({
          roomId,
          content,
          participantName, // Fixed: was 'sender', now matches server expectation
        });

        // Refresh data after sending
        void roomQuery.refetch();
        void messagesQuery.refetch();

        return result;
      } catch (error) {
        console.error("Failed to send message to AI:", error);
        throw error;
      }
    },
    [
      roomId,
      participantName,
      sendMessageToAIMutation,
      roomQuery,
      messagesQuery,
    ],
  );

  // Auto-join when both roomId and participantName are available
  useEffect(() => {
    if (roomId && participantName && !hasAttemptedJoin) {
      void joinRoom();
    }
  }, [roomId, participantName, hasAttemptedJoin, joinRoom]);

  // WebSocket connection attempt (with timeout and fallback)
  useEffect(() => {
    if (!roomId || !hasAttemptedJoin) return;

    let timeoutId: NodeJS.Timeout;
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;

        ws = new WebSocket(wsUrl);

        // Set a connection timeout
        timeoutId = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            setWsError("WebSocket connection timeout");
            setIsWebSocketConnected(false);
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeoutId);
          setIsWebSocketConnected(true);
          setWsError(null);

          // Send join message
          ws?.send(
            JSON.stringify({
              type: "join",
              roomId,
              clientType: "v2",
            }),
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);

            // Handle different message types
            if (
              data.type === "update" ||
              data.type === "message" ||
              data.type === "aiMessage"
            ) {
              // Refresh data when we get updates
              void refreshData();
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(timeoutId);
          setIsWebSocketConnected(false);

          // Only set error if it wasn't a clean close
          if (event.code !== 1000) {
            setWsError(`WebSocket closed: ${event.code}`);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          setIsWebSocketConnected(false);
          setWsError("WebSocket connection failed");
        };
      } catch (error) {
        setWsError("Failed to create WebSocket connection");
        setIsWebSocketConnected(false);
      }
    };

    // Try to connect
    connectWebSocket();

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (ws) {
        ws.close(1000);
      }
    };
  }, [roomId, hasAttemptedJoin, refreshData]);

  return {
    room: roomQuery.data?.room,
    messages: messagesQuery.data?.messages ?? [],
    isLoading: roomQuery.isLoading || messagesQuery.isLoading,
    joinRoom: () => {
      if (!hasAttemptedJoin && !joinRoomMutation.isPending) {
        setHasAttemptedJoin(true);
        joinRoomMutation.mutate({ roomId, userName: participantName });
      }
    },
    sendMessage,
    sendMessageToAI,
    isJoining: joinRoomMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isSendingToAI: sendMessageToAIMutation.isPending,
    isWebSocketConnected,
    refreshData, // Manual refresh - the ONLY way to sync when WebSocket is down
    error: roomQuery.error?.message || messagesQuery.error?.message || wsError,
  };
}
