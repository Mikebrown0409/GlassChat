"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCollaborationStore } from "~/lib/collaboration/store";
import { USER_COLORS, type UserPresence } from "~/lib/collaboration/types";
import { usePusherCollaboration } from "./pusherHooks";

// Bridge types that match the legacy interface
interface BridgedUser {
  id: string;
  name: string;
  email?: string;
  sessionId: string;
}

interface BridgedRoom {
  id: string;
  name?: string;
  chatId: string;
  users: BridgedUser[];
  createdAt: string;
}

interface BridgedMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  roomId: string;
}

interface JoinRoomResult {
  success: boolean;
  room?: BridgedRoom;
  error?: string;
}

interface RoomOperationResult {
  success: boolean;
  room?: BridgedRoom;
  error?: string;
}

/**
 * Bridge hook that provides the legacy collaboration interface
 * while using the new V2 system under the hood
 */
export function useCollaborationBridge(roomId: string | null) {
  const { data: session } = useSession();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [collaborationMessages, setCollaborationMessages] = useState<
    BridgedMessage[]
  >([]);

  // Get legacy store setters
  const { setCurrentRoomId, setOnlineUsers } = useCollaborationStore();

  // Use Pusher collaboration system with the current user's name
  const participantName =
    session?.user?.name ?? session?.user?.email ?? "Anonymous";
  const pusherCollab = usePusherCollaboration({
    roomId: roomId ?? undefined,
    userId: participantName,
    onMessageSync: (event) => {
      console.log("📨 [Bridge] Message sync:", event);

      // Convert Pusher message to bridge format and add to messages
      // For now, just assume all events are chat messages since that's what we're sending
      if (roomId) {
        const bridgedMessage: BridgedMessage = {
          id: `${event.timestamp}-${event.sender}`,
          content: event.content,
          sender: event.sender,
          timestamp: new Date(event.timestamp).toISOString(),
          roomId: roomId,
        };

        setCollaborationMessages((prev) => {
          // Avoid duplicates
          if (prev.some((msg) => msg.id === bridgedMessage.id)) {
            return prev;
          }
          return [...prev, bridgedMessage].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        });
      }
    },
    onRoomStateUpdate: (event) => {
      console.log("🏠 [Bridge] Room state update:", event);
    },
  });

  // Update legacy store when room data changes
  useEffect(() => {
    setCurrentRoomId(roomId);
    // Clear messages when switching rooms
    setCollaborationMessages([]);
  }, [roomId, setCurrentRoomId]);

  // Convert Pusher participants to legacy UserPresence format and update store
  useEffect(() => {
    if (roomId && pusherCollab.isConnected) {
      // For now, create a simple presence list with just the current user
      // Pusher system doesn't provide participant list in the simple setup
      const userPresences: UserPresence[] = [
        {
          userId: participantName,
          userName: participantName,
          roomId: roomId,
          isOnline: true,
          lastSeen: Date.now(),
          isTyping: false,
          color: USER_COLORS[0],
        },
      ];

      setOnlineUsers(userPresences);
    } else {
      setOnlineUsers([]);
    }
  }, [roomId, pusherCollab.isConnected, participantName, setOnlineUsers]);

  // Create bridged user object
  const bridgedUser: BridgedUser | null = useMemo(() => {
    if (!session?.user) return null;

    return {
      id: session.user.id ?? session.user.email ?? "anonymous",
      name: participantName,
      email: session.user.email ?? undefined,
      sessionId: `session-${Date.now()}`, // Simple session ID
    };
  }, [session?.user, participantName]);

  // Transform Pusher room to legacy format
  const bridgedRoom: BridgedRoom | undefined = useMemo(() => {
    if (!roomId || !pusherCollab.isConnected) return undefined;

    return {
      id: roomId,
      name: `Room ${roomId}`,
      chatId: `shared-room-${roomId}`, // Use consistent chatId
      users: [
        {
          id: participantName,
          name: participantName,
          email: session?.user?.email ?? undefined,
          sessionId: `session-${participantName}`,
        },
      ],
      createdAt: new Date().toISOString(),
    };
  }, [roomId, pusherCollab.isConnected, participantName, session?.user?.email]);

  // Return the collaboration messages received via Pusher
  const bridgedMessages: BridgedMessage[] = collaborationMessages;

  // Create room function (bridges to V2)
  const createRoom = useCallback(
    async (roomName: string): Promise<RoomOperationResult> => {
      setIsCreatingRoom(true);
      try {
        // In V2, we don't pre-create rooms - they're created when first joined
        // So we'll return a placeholder response for now
        const newRoomId = `room-${Date.now()}`;

        return {
          success: true,
          room: {
            id: newRoomId,
            name: roomName,
            chatId: `room-${newRoomId}-${Date.now()}`,
            users: [],
            createdAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create room",
        };
      } finally {
        setIsCreatingRoom(false);
      }
    },
    [],
  );

  // Join room function (uses Pusher)
  const joinRoom = useCallback(
    async (targetRoomId: string): Promise<JoinRoomResult> => {
      setIsJoiningRoom(true);
      try {
        // Join the room via Pusher
        await pusherCollab.joinRoom(targetRoomId);

        return {
          success: true,
          room: {
            id: targetRoomId,
            name: `Room ${targetRoomId}`,
            chatId: `shared-room-${targetRoomId}`,
            users: [
              {
                id: participantName,
                name: participantName,
                email: session?.user?.email ?? undefined,
                sessionId: `session-${participantName}`,
              },
            ],
            createdAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to join room",
        };
      } finally {
        setIsJoiningRoom(false);
      }
    },
    [pusherCollab, participantName, session?.user?.email],
  );

  // Leave room function (bridges to V2)
  const leaveRoom = useCallback(async (): Promise<RoomOperationResult> => {
    setIsLeavingRoom(true);
    try {
      // In V2, we don't have an explicit leave function
      // This would be handled by changing the roomId to null
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to leave room",
      };
    } finally {
      setIsLeavingRoom(false);
    }
  }, []);

  // Send message function (uses Pusher)
  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId) return;
      await pusherCollab.sendMessage({
        type: "chat_message",
        content: content,
        sender: participantName,
        timestamp: Date.now(),
      });
    },
    [pusherCollab, roomId, participantName],
  );

  // Edit message function (placeholder for legacy compatibility)
  const editMessage = useCallback(
    async (_messageId: string, _newContent: string) => {
      // V2 system doesn't support message editing yet
      console.warn("Message editing not supported in V2 system yet");
    },
    [],
  );

  // Delete message function (placeholder for legacy compatibility)
  const deleteMessage = useCallback(async (_messageId: string) => {
    // V2 system doesn't support message deletion yet
    console.warn("Message deletion not supported in V2 system yet");
  }, []);

  // Return the bridged interface that matches the legacy hook
  return {
    // User management
    user: bridgedUser,
    createUser: async (_name?: string) => bridgedUser, // V2 handles user creation automatically
    isCreating: false, // V2 doesn't have user creation concept
    isCreatingUser: false,

    // Room management
    rooms: [], // V2 doesn't provide room listing yet
    isLoadingRooms: false,
    createRoom,
    joinRoom,
    leaveRoom,
    isCreatingRoom,
    isJoiningRoom,
    isLeavingRoom,

    // Current room data
    room: bridgedRoom,
    messages: bridgedMessages,
    typingUsers: [], // V2 doesn't support typing indicators yet
    onlineUsers: bridgedRoom?.users ?? [],
    onlineUsersCount: bridgedRoom?.users.length ?? 0,
    liveCodingSession: undefined, // V2 doesn't support live coding yet
    events: [], // V2 doesn't support events yet

    // Message operations
    sendMessage,
    editMessage,
    deleteMessage,

    // Live coding (placeholders for legacy compatibility)
    updateCode: () => Promise.resolve(), // Return resolved promise instead of async empty function
    localContent: "",
    toggleLiveCoding: () => Promise.resolve(), // Return resolved promise instead of async empty function
    startTyping: () => Promise.resolve(), // Return resolved promise instead of async empty function
    stopTyping: () => Promise.resolve(), // Return resolved promise instead of async empty function
    lastSyncTime: 0,

    // Loading states
    isSendingMessage: false,
    isUpdatingCode: false,
    isTogglingLiveCoding: false,

    // Pusher specific features
    isWsConnected: pusherCollab.isConnected,
    refreshData: () => {
      // Manual refresh - reload the page for now
      window.location.reload();
    },
    sendMessageToAI: async (_content: string) => {
      // Placeholder - AI integration handled by main chat
    },
    isSendingToAI: false,
  };
}
