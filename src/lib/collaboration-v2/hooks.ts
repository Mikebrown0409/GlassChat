// Simple Collaboration Hook
// Minimal state management for room collaboration

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { CollaborationV2WSClient } from "./wsClient";

export function useCollaboration(roomId: string, participantName: string) {
  const queryClient = useQueryClient();
  const wsClientRef = useRef<CollaborationV2WSClient | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

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
    { roomId },
    {
      enabled: !!roomId,
      staleTime: Infinity, // Never auto-refetch - manual refresh only
      refetchOnWindowFocus: false, // No auto-refresh
    },
  );

  // Messages query - NO auto-polling, manual refresh only
  const messagesQuery = api.collaborationV2.getMessages.useQuery(
    { roomId },
    {
      enabled: !!roomId,
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
  const refreshData = async () => {
    console.log("[CollabV2] Manually refreshing data...");

    // Force refetch both queries immediately
    try {
      await Promise.all([roomQuery.refetch(), messagesQuery.refetch()]);
      console.log("[CollabV2] Manual refresh completed successfully");
    } catch (error) {
      console.error("[CollabV2] Manual refresh failed:", error);

      // Fallback: Try invalidation approach
      queryClient.invalidateQueries({
        queryKey: ["collaborationV2", "room", roomId],
      });
      queryClient.invalidateQueries({
        queryKey: ["collaborationV2", "messages", roomId],
      });
    }
  };

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
  useEffect(() => {
    if (
      roomId &&
      participantName &&
      !hasAttemptedJoin &&
      !joinRoomMutation.isPending
    ) {
      console.log(
        "[CollabV2] Auto-joining room:",
        roomId,
        "as",
        participantName,
      );
      setHasAttemptedJoin(true); // Prevent multiple attempts
      joinRoomMutation.mutate({ roomId, userName: participantName });
    }
  }, [roomId, participantName, hasAttemptedJoin, joinRoomMutation]);

  // Reset join attempt when room or participant changes
  useEffect(() => {
    setHasAttemptedJoin(false);
  }, [roomId, participantName]);

  // Helper function to send message
  const sendMessage = async (content: string) => {
    return sendMessageMutation.mutateAsync({
      roomId,
      participantName,
      content,
    });
  };

  // Helper function to send message to AI
  const sendMessageToAI = async (content: string) => {
    return sendMessageToAIMutation.mutateAsync({
      roomId,
      participantName,
      content,
    });
  };

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
  };
}
