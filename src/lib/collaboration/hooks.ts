// React hooks for real-time collaboration features
// Uses tRPC for server communication and local state management

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../trpc/react";
import type {
  CollaborationEvent,
  CollaborationEventType,
  CollaborationMessage,
  CollaborationRoom,
  CollaborationUser,
  LiveCodingSession,
  TypingIndicator,
  UserPresence,
} from "./types";
import { CollaborationWSClient } from "./wsClient";

// Global state to prevent multiple user creation attempts across components
let globalUserCreationState = {
  isCreating: false,
  user: null as CollaborationUser | null,
  sessionId: null as string | null,
};

// Helper to get consistent session ID
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";

  // Use a combination of factors for session identification
  const userAgent = navigator.userAgent.slice(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);

  return `session-${userAgent}-${timestamp}-${random}`;
}

// Server-side collaboration now handles all presence management

// *** NEW UNIFIED COLLABORATION HOOK - Replaces all individual hooks ***
export function useUnifiedCollaboration(roomId: string | null) {
  const [allData, setAllData] = useState<{
    room?: CollaborationRoom;
    messages: CollaborationMessage[];
    typingUsers: TypingIndicator[];
    onlineUsers: UserPresence[];
    liveCodingSession?: LiveCodingSession;
    events: CollaborationEvent[];
  }>({
    messages: [],
    typingUsers: [],
    onlineUsers: [],
    events: [],
  });

  const [localContent, setLocalContent] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const [wsClient, setWsClient] = useState<CollaborationWSClient | null>(null);

  // Single API call that fetches ALL collaboration data
  const { data: roomData, refetch } = api.collaboration.getRoomData.useQuery(
    { roomId: (roomId || "skip") as string },
    {
      enabled: !!roomId && roomId.length > 0 && !isUserTyping,
      refetchInterval: isUserTyping ? false : 10000, // Reduced polling frequency
      staleTime: 5000, // Consider data fresh for longer
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnReconnect: false, // Prevent refetch on reconnect
    },
  );

  // Load cached messages on first run for this room
  useEffect(() => {
    if (!roomId || hasLoadedCache) return;
    try {
      const cached = localStorage.getItem(`lc_msgs_${roomId}`);
      if (cached) {
        const msgs = JSON.parse(cached) as CollaborationMessage[];
        if (msgs.length) {
          setAllData((prev) => ({ ...prev, messages: msgs }));
        }
      }
    } catch {
      /* ignore parse errors */
    } finally {
      setHasLoadedCache(true);
    }
  }, [roomId, hasLoadedCache]);

  // Persist messages to cache whenever they change
  useEffect(() => {
    if (!roomId) return;
    try {
      localStorage.setItem(
        `lc_msgs_${roomId}`,
        JSON.stringify(allData.messages),
      );
    } catch {
      /* quota exceeded etc. */
    }
  }, [roomId, allData.messages]);

  // Update local state when data arrives (but not while user is typing)
  useEffect(() => {
    if (roomData?.data && !isUserTyping) {
      const newData = roomData.data;

      setAllData((prev) => {
        const tempMsgs = prev.messages.filter((m) => m.id.startsWith("temp-"));
        const sourceMessages =
          newData.messages && newData.messages.length > 0
            ? newData.messages
            : prev.messages;

        // Deduplicate by id: keep first occurrence (sourceMessages wins over temp)
        const ids = new Set<string>();
        const mergedMessages: typeof sourceMessages = [];
        [...sourceMessages, ...tempMsgs].forEach((m) => {
          if (!ids.has(m.id)) {
            ids.add(m.id);
            mergedMessages.push(m);
          }
        });

        const result = {
          room: newData.room,
          messages: mergedMessages,
          typingUsers: newData.typingUsers || [],
          onlineUsers: newData.onlineUsers || [],
          liveCodingSession: newData.liveCodingSession,
          events: newData.events || [],
        };

        return result;
      });

      // Update local content only if different and not typing
      if (
        newData.liveCodingSession?.content &&
        newData.liveCodingSession.content !== localContent
      ) {
        setLocalContent(newData.liveCodingSession.content);
      }
    }
  }, [roomData, isUserTyping, localContent, roomId]);

  // Mutation hooks (these still need individual calls)
  const sendMessageMutation = api.collaboration.sendMessage.useMutation({
    onSuccess: () => {
      // Immediate refetch for messages
      void refetch();
    },
  });

  const updateCodeMutation = api.collaboration.updateLiveCode.useMutation({
    onSuccess: () => {
      setLastSyncTime(Date.now());
      // Refetch after a short delay to get updated data
      setTimeout(() => void refetch(), 1000);
    },
  });

  const toggleLiveCodingMutation =
    api.collaboration.toggleLiveCodingMode.useMutation({
      onSuccess: () => {
        // Immediate refetch for mode changes
        void refetch();
      },
    });

  const startTypingMutation = api.collaboration.startTyping.useMutation();
  const stopTypingMutation = api.collaboration.stopTyping.useMutation();

  const editMessageMutation = api.collaboration.editMessage.useMutation({
    onSuccess: () => void refetch(),
  });
  const deleteMessageMutation = api.collaboration.deleteMessage.useMutation({
    onSuccess: () => void refetch(),
  });

  const optimisticRemove = (id: string) => {
    setAllData((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== id),
    }));
  };
  const optimisticEdit = (id: string, content: string) => {
    setAllData((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === id ? { ...m, content, updatedAt: Date.now() } : m,
      ),
    }));
  };

  const optimisticAdd = (msg: CollaborationMessage) => {
    setAllData((prev) => ({
      ...prev,
      messages: [...prev.messages, msg],
    }));
  };

  // Debounced code update with conflict prevention
  const updateCode = useCallback(
    (content: string, cursorPosition?: { line: number; column: number }) => {
      if (!roomId) return Promise.reject(new Error("No room selected"));

      // If WebSocket client active, update Yjs text directly (no debounce)
      if (wsClient) {
        const yText = wsClient.getText();
        yText.delete(0, yText.length);
        yText.insert(0, content);
        return Promise.resolve();
      }

      setLocalContent(content);
      setIsUserTyping(true);

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      return new Promise<void>((resolve, reject) => {
        updateTimeoutRef.current = setTimeout(() => {
          setIsUserTyping(false);
          updateCodeMutation
            .mutateAsync({
              roomId,
              content,
              cursorPosition,
            })
            .then(() => resolve())
            .catch(reject);
        }, 500); // 500ms debounce
      });
    },
    [roomId, wsClient, updateCodeMutation],
  );

  const sendMessage = useCallback(
    async (content: string, type: "text" | "system" | "code" = "text") => {
      if (!roomId) throw new Error("No room selected");

      // Create optimistic message
      const tempMsg: CollaborationMessage = {
        id: `temp-${Date.now()}`,
        roomId,
        userId: "current", // Will be replaced by server
        content,
        timestamp: Date.now(),
        type,
      };
      optimisticAdd(tempMsg);

      try {
        await sendMessageMutation.mutateAsync({ roomId, content, type });
      } catch (error) {
        // Remove optimistic message on error
        optimisticRemove(tempMsg.id);
        throw error;
      }
    },
    [roomId, sendMessageMutation],
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!roomId) throw new Error("No room selected");

      optimisticEdit(messageId, newContent);
      try {
        await editMessageMutation.mutateAsync({
          roomId,
          messageId,
          newContent,
        });
      } catch (error) {
        // Revert optimistic edit - would need original content
        throw error;
      }
    },
    [roomId, editMessageMutation],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId) throw new Error("No room selected");

      optimisticRemove(messageId);
      try {
        await deleteMessageMutation.mutateAsync({ roomId, messageId });
      } catch (error) {
        // Would need to restore the message on error
        throw error;
      }
    },
    [roomId, deleteMessageMutation],
  );

  const toggleLiveCodingMode = useCallback(async () => {
    if (!roomId) throw new Error("No room selected");
    return toggleLiveCodingMutation.mutateAsync({ roomId });
  }, [roomId, toggleLiveCodingMutation]);

  const startTyping = useCallback(async () => {
    if (!roomId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await startTypingMutation.mutateAsync({ roomId });

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      void stopTypingMutation.mutateAsync({ roomId });
    }, 3000);
  }, [roomId, startTypingMutation, stopTypingMutation]);

  const stopTyping = useCallback(async () => {
    if (!roomId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await stopTypingMutation.mutateAsync({ roomId });
  }, [roomId, stopTypingMutation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    room: allData.room,
    messages: allData.messages,
    typingUsers: allData.typingUsers,
    onlineUsers: allData.onlineUsers,
    liveCodingSession: allData.liveCodingSession,
    events: allData.events,
    localContent,
    lastSyncTime,

    // Computed
    isLiveCodingMode: allData.room?.isLiveCodingMode ?? false,

    // Actions
    sendMessage,
    editMessage,
    deleteMessage,
    updateCode,
    toggleLiveCodingMode,
    startTyping,
    stopTyping,
    refetch,

    // Loading states
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isUpdating: updateCodeMutation.isPending,
    isToggling: toggleLiveCodingMutation.isPending,
  };
}

// IMPROVED: Centralized user management with global state
export function useCollaborationUser() {
  const [user, setUser] = useState<CollaborationUser | null>(
    globalUserCreationState.user,
  );
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(
    globalUserCreationState.isCreating,
  );

  // Try load from localStorage first
  useEffect(() => {
    if (typeof window === "undefined" || hasInitialized) return;

    const stored = localStorage.getItem("collab_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CollaborationUser;

        // Check if stored user is stale (older than 1 hour)
        const isStale =
          parsed.lastSeen && Date.now() - parsed.lastSeen > 60 * 60 * 1000;

        if (isStale) {
          console.log("Clearing stale localStorage user data");
          localStorage.removeItem("collab_user");
        } else {
          setUser(parsed);
          globalUserCreationState.user = parsed;
          console.log("User loaded from localStorage:", parsed.name);
        }
      } catch {
        // Clear invalid stored data
        localStorage.removeItem("collab_user");
      }
    }
    setHasInitialized(true);
  }, [hasInitialized]);

  const { data: userData, error: getUserError } =
    api.collaboration.getCurrentUser.useQuery(undefined, {
      enabled: hasInitialized && !user && !isCreatingUser,
      retry: 1, // Reduce retries to prevent spam
      staleTime: 30000, // Cache for 30 seconds
      refetchOnWindowFocus: false,
    });

  // Handle getUserError separately
  useEffect(() => {
    if (getUserError) {
      console.error("Failed to get current collaboration user:", getUserError);
    }
  }, [getUserError]);

  const createUserMutation = api.collaboration.createUser.useMutation({
    onMutate: () => {
      setIsCreatingUser(true);
      globalUserCreationState.isCreating = true;
    },
    onSuccess: async (data) => {
      setIsCreatingUser(false);
      globalUserCreationState.isCreating = false;

      if (data.success && data.user) {
        setUser(data.user);
        globalUserCreationState.user = data.user;
        try {
          localStorage.setItem("collab_user", JSON.stringify(data.user));
        } catch {
          // Ignore localStorage errors
        }
        console.log(
          "✅ Collaboration user created successfully:",
          data.user.name,
        );
      } else if (data.error) {
        console.error("Failed to create collaboration user:", data.error);
      }
    },
    onError: (error) => {
      setIsCreatingUser(false);
      globalUserCreationState.isCreating = false;
      console.error(
        "Failed to create collaboration user (mutation error):",
        error,
      );
    },
  });

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
      globalUserCreationState.user = userData.user;
      try {
        localStorage.setItem("collab_user", JSON.stringify(userData.user));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [userData]);

  const createUser = useCallback(
    (name: string, avatarUrl?: string) => {
      // CRITICAL FIX: Check global state to prevent duplicates across components
      if (globalUserCreationState.user || globalUserCreationState.isCreating) {
        console.log(
          "🔄 User already exists or being created globally, skipping duplicate:",
          globalUserCreationState.user?.name || "creating...",
        );
        return Promise.resolve({
          success: true,
          user: globalUserCreationState.user,
        });
      }

      // Validate input
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return Promise.reject(
          new Error("Name is required and must be a non-empty string"),
        );
      }

      console.log("🆕 Creating new collaboration user:", name.trim());
      return createUserMutation.mutateAsync({
        name: name.trim(),
        avatarUrl: avatarUrl || undefined,
      });
    },
    [createUserMutation],
  );

  return {
    user,
    createUser,
    isCreating: createUserMutation.isPending || isCreatingUser,
  };
}

// IMPROVED: Room management with better state tracking
export function useCollaborationRooms() {
  const [rooms, setRooms] = useState<CollaborationRoom[]>([]);
  const [joinAttempts, setJoinAttempts] = useState<Set<string>>(new Set());

  const { data: roomsData, refetch } = api.collaboration.getRooms.useQuery(
    undefined,
    {
      refetchInterval: 20000, // Even less frequent: 20 seconds
      staleTime: 10000, // Consider data fresh for 10 seconds
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const createRoomMutation = api.collaboration.createRoom.useMutation({
    onSuccess: () => {
      // Immediate refetch for created rooms
      setTimeout(() => void refetch(), 500);
    },
  });

  const joinRoomMutation = api.collaboration.joinRoom.useMutation({
    onSuccess: () => {
      // Immediate refetch when user joins
      setTimeout(() => void refetch(), 500);
    },
  });

  const leaveRoomMutation = api.collaboration.leaveRoom.useMutation({
    onSuccess: () => {
      setTimeout(() => void refetch(), 500);
    },
  });

  useEffect(() => {
    if (roomsData?.rooms) {
      setRooms(roomsData.rooms);
    }
  }, [roomsData]);

  const createRoom = useCallback(
    (chatId: string, name: string) => {
      console.log("🏗️ Creating collaboration room:", name);
      return createRoomMutation.mutateAsync({ chatId, name });
    },
    [createRoomMutation],
  );

  const joinRoom = useCallback(
    async (roomId: string) => {
      // Prevent duplicate join attempts
      if (joinAttempts.has(roomId)) {
        console.log("🔄 Join already in progress for room:", roomId);
        return { success: false, error: "Join already in progress" };
      }

      setJoinAttempts((prev) => new Set([...prev, roomId]));

      try {
        console.log("🚪 Joining room via server:", roomId);
        const result = await joinRoomMutation.mutateAsync({ roomId });
        console.log("✅ Successfully joined room:", roomId);
        return result;
      } finally {
        // Clear join attempt after completion
        setJoinAttempts((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      }
    },
    [joinRoomMutation, joinAttempts],
  );

  const leaveRoom = useCallback(
    async (roomId: string) => {
      console.log("🚪 Leaving room:", roomId);
      const result = await leaveRoomMutation.mutateAsync({ roomId });

      // Clear any join attempts for this room
      setJoinAttempts((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });

      return result;
    },
    [leaveRoomMutation],
  );

  return {
    rooms,
    createRoom,
    joinRoom,
    leaveRoom,
    isCreating: createRoomMutation.isPending,
    isJoining: joinRoomMutation.isPending,
    isLeaving: leaveRoomMutation.isPending,
    refetch,
  };
}

// Legacy hooks for backward compatibility (now just use the unified hook)
export function useCollaborationMessages(roomId: string | null) {
  const unified = useUnifiedCollaboration(roomId);
  return {
    messages: unified.messages,
    sendMessage: unified.sendMessage,
    editMessage: unified.editMessage,
    deleteMessage: unified.deleteMessage,
    isSending: unified.isSending,
    isEditing: unified.isEditing,
    isDeleting: unified.isDeleting,
    refetch: unified.refetch,
  };
}

export function useTypingIndicators(roomId: string | null) {
  const unified = useUnifiedCollaboration(roomId);
  return {
    typingUsers: unified.typingUsers,
    startTyping: unified.startTyping,
    stopTyping: unified.stopTyping,
  };
}

export function useLiveCoding(roomId: string | null) {
  const unified = useUnifiedCollaboration(roomId);
  return {
    session: unified.liveCodingSession,
    localContent: unified.localContent,
    isLiveCodingMode: unified.isLiveCodingMode,
    toggleLiveCodingMode: unified.toggleLiveCodingMode,
    updateCode: unified.updateCode,
    isToggling: unified.isToggling,
    isUpdating: unified.isUpdating,
    lastSyncTime: unified.lastSyncTime,
    setUserTyping: () => {
      // Legacy function - no longer needed with unified hook
    },
  };
}

export function useUserPresence(roomId: string | null) {
  const unified = useUnifiedCollaboration(roomId);
  return {
    onlineUsers: unified.onlineUsers,
    onlineCount: unified.onlineUsers.length,
  };
}

export function useCollaborationEvents(roomId: string | null) {
  const unified = useUnifiedCollaboration(roomId);

  // Simple implementation that doesn't break the component
  const addEventListener = useCallback(
    (
      eventType: CollaborationEventType,
      _handler: (event: CollaborationEvent) => void,
    ) => {
      // For now, just log that an event listener was added
      console.log("Event listener added for:", eventType);
      // In a full implementation, you'd store these handlers and call them when events occur
    },
    [],
  );

  const removeEventListener = useCallback(
    (
      eventType: CollaborationEventType,
      _handler: (event: CollaborationEvent) => void,
    ) => {
      // For now, just log that an event listener was removed
      console.log("Event listener removed for:", eventType);
    },
    [],
  );

  return {
    events: unified.events,
    addEventListener,
    removeEventListener,
  };
}

export function useDebouncedLiveCoding(roomId: string | null) {
  return useLiveCoding(roomId); // Already debounced in unified hook
}

// IMPROVED: Main hook with better join logic and state management
export function useCollaboration(roomId: string | null) {
  const user = useCollaborationUser();
  const rooms = useCollaborationRooms();
  const unified = useUnifiedCollaboration(roomId);
  const [hasJoinedRoom, setHasJoinedRoom] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Clear join state when room changes
  useEffect(() => {
    if (hasJoinedRoom && hasJoinedRoom !== roomId) {
      setHasJoinedRoom(null);
    }
  }, [roomId, hasJoinedRoom]);

  // Join room on server when user and room are available
  const joinRoomMutation = api.collaboration.joinRoom.useMutation({
    onSuccess: () => {
      // Trigger immediate refetch of unified collaboration data
      setTimeout(() => void unified.refetch(), 300);
    },
  });

  useEffect(() => {
    // Don't auto-join if conditions aren't met
    if (!roomId || !user.user || hasJoinedRoom === roomId || isJoining) {
      return;
    }

    // Don't join if we already have room data for this room (already joined)
    if (unified.room?.id === roomId) {
      setHasJoinedRoom(roomId);
      console.log("🏠 Room already joined:", roomId);
      return;
    }

    // Only auto-join if this is likely a programmatic join (not user initiated)
    // This prevents excessive auto-joining when components re-render
    const shouldAutoJoin = !hasJoinedRoom || hasJoinedRoom !== roomId;

    if (!shouldAutoJoin) {
      return;
    }

    const joinRoom = async () => {
      setIsJoining(true);
      try {
        console.log("🔧 Auto-joining room:", roomId);
        await joinRoomMutation.mutateAsync({ roomId });
        setHasJoinedRoom(roomId);
        console.log("✅ Auto-joined room successfully:", roomId);
      } catch (error) {
        console.error("❌ Failed to auto-join room:", error);
        // Reset join state on error so it can be retried later
        setHasJoinedRoom(null);
      } finally {
        setIsJoining(false);
      }
    };

    // Longer delay to reduce aggressive auto-joining
    const timeoutId = setTimeout(joinRoom, 500);
    return () => clearTimeout(timeoutId);
  }, [
    roomId,
    user.user,
    hasJoinedRoom,
    isJoining,
    unified.room?.id,
    joinRoomMutation,
  ]);

  // Get online users from server data only
  const onlineUsers = unified.onlineUsers || [];
  const onlineUsersCount = onlineUsers.length;

  return {
    // User management
    user: user.user,
    createUser: user.createUser,
    isCreatingUser: user.isCreating,

    // Room management
    rooms: rooms.rooms,
    isLoadingRooms: false, // No loading state in rooms hook
    createRoom: rooms.createRoom,
    joinRoom: rooms.joinRoom,
    leaveRoom: rooms.leaveRoom,
    isCreatingRoom: rooms.isCreating,
    isJoiningRoom: rooms.isJoining,
    isLeavingRoom: rooms.isLeaving,

    // Current room data
    room: unified.room,
    messages: unified.messages,
    typingUsers: unified.typingUsers,
    onlineUsers,
    onlineUsersCount,
    liveCodingSession: unified.liveCodingSession,
    events: unified.events,

    // Message operations
    sendMessage: unified.sendMessage,
    editMessage: unified.editMessage,
    deleteMessage: unified.deleteMessage,

    // Live coding
    updateCode: unified.updateCode,
    localContent: unified.localContent,
    toggleLiveCoding: unified.toggleLiveCodingMode,
    startTyping: unified.startTyping,
    stopTyping: unified.stopTyping,
    lastSyncTime: unified.lastSyncTime,

    // Loading states
    isSendingMessage: unified.isSending,
    isUpdatingCode: unified.isUpdating,
    isTogglingLiveCoding: unified.isToggling,
  };
}
