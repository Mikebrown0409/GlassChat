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
    { roomId: roomId ?? "" },
    {
      enabled: !!roomId && !isUserTyping, // Don't fetch while user is typing
      refetchInterval: isUserTyping ? false : 15000, // Much slower: 15 seconds
      staleTime: 5000, // Consider data fresh for 5 seconds
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

        return {
          room: newData.room,
          messages: mergedMessages,
          typingUsers: newData.typingUsers || [],
          onlineUsers: newData.onlineUsers || [],
          liveCodingSession: newData.liveCodingSession,
          events: newData.events || [],
        };
      });

      // Update local content only if different and not typing
      if (
        newData.liveCodingSession?.content &&
        newData.liveCodingSession.content !== localContent
      ) {
        setLocalContent(newData.liveCodingSession.content);
      }
    }
  }, [roomData, isUserTyping, localContent]);

  // Mutation hooks (these still need individual calls)
  const sendMessageMutation = api.collaboration.sendMessage.useMutation({
    onSuccess: () => void refetch(),
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
      onSuccess: () => void refetch(),
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

      // ---- Legacy HTTP fallback ----
      setLocalContent(content);

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      setIsUserTyping(true);

      updateTimeoutRef.current = setTimeout(() => {
        updateCodeMutation
          .mutateAsync({ roomId, content, cursorPosition })
          .finally(() => {
            typingTimeoutRef.current = setTimeout(() => {
              setIsUserTyping(false);
            }, 1000);
          });
      }, 2000);

      return Promise.resolve();
    },
    [roomId, updateCodeMutation, wsClient],
  );

  const sendMessage = useCallback(
    (content: string, type: "text" | "system" | "code" = "text") => {
      if (!roomId) return Promise.reject(new Error("No room selected"));
      const currentUserId = "";
      const tempId = "temp-" + Math.random().toString(36).slice(2, 9);
      const tempMsg: CollaborationMessage = {
        id: tempId,
        roomId,
        userId: currentUserId,
        content,
        timestamp: Date.now(),
        type,
      } as CollaborationMessage;
      optimisticAdd(tempMsg);
      return sendMessageMutation
        .mutateAsync({ roomId, content, type })
        .then((res) => {
          if (res.success && res.message) {
            // replace temp message or push if not found
            setAllData((prev) => ({
              ...prev,
              messages: [
                ...prev.messages.filter((m) => m.id !== tempId),
                res.message!,
              ],
            }));
          }
        });
    },
    [roomId, sendMessageMutation],
  );

  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      if (!roomId) return Promise.reject(new Error("No room selected"));
      optimisticEdit(messageId, newContent);
      return editMessageMutation.mutateAsync({ roomId, messageId, newContent });
    },
    [roomId, editMessageMutation],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!roomId) return Promise.reject(new Error("No room selected"));
      optimisticRemove(messageId);
      return deleteMessageMutation.mutateAsync({ roomId, messageId });
    },
    [roomId, deleteMessageMutation],
  );

  const toggleLiveCodingMode = useCallback(() => {
    if (!roomId) return Promise.reject(new Error("No room selected"));
    return toggleLiveCodingMutation.mutateAsync({ roomId });
  }, [roomId, toggleLiveCodingMutation]);

  const startTyping = useCallback(() => {
    if (!roomId) return;
    void startTypingMutation.mutateAsync({ roomId });
  }, [roomId, startTypingMutation]);

  const stopTyping = useCallback(() => {
    if (!roomId) return;
    void stopTypingMutation.mutateAsync({ roomId });
  }, [roomId, stopTypingMutation]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // after roomId change, setup ws if enabled
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_WS !== "true") return;
    if (!roomId) return;
    const client = new CollaborationWSClient(roomId);
    client.connect();
    setWsClient(client);
    client.onUpdate(() => {
      // For now, sync live coding content
      const txt = client.getText();
      setLocalContent(txt.toString());
    });
    // set initial value
    setLocalContent(client.getText().toString());
    return () => {
      setWsClient(null);
    };
  }, [roomId]);

  return {
    // All data in one object
    ...allData,

    // Live coding specific
    localContent,
    isLiveCodingMode: !!allData.liveCodingSession,

    // Actions
    updateCode,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleLiveCodingMode,
    startTyping,
    stopTyping,

    // Status
    isUpdating: updateCodeMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isToggling: toggleLiveCodingMutation.isPending,
    lastSyncTime,

    // Manual refresh (rarely needed)
    refetch,
  };
}

// Simplified hook for just user management (no polling)
export function useCollaborationUser() {
  const [user, setUser] = useState<CollaborationUser | null>(null);

  // Try load from localStorage first
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("collab_user") : null;
  if (stored && !user) {
    try {
      const parsed = JSON.parse(stored) as CollaborationUser;
      setUser(parsed);
    } catch {}
  }

  const { data: userData } = api.collaboration.getCurrentUser.useQuery(
    undefined,
    { enabled: !stored },
  );

  const createUserMutation = api.collaboration.createUser.useMutation({
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem("collab_user", JSON.stringify(data.user));
        } catch {}
      }
    },
  });

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
    }
  }, [userData]);

  const createUser = useCallback(
    (name: string, avatarUrl?: string) => {
      return createUserMutation.mutateAsync({ name, avatarUrl });
    },
    [createUserMutation],
  );

  return {
    user,
    createUser,
    isCreating: createUserMutation.isPending,
  };
}

// Simplified hook for room management (less frequent polling)
export function useCollaborationRooms() {
  const [rooms, setRooms] = useState<CollaborationRoom[]>([]);

  const { data: roomsData, refetch } = api.collaboration.getRooms.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Much slower: 30 seconds
      staleTime: 10000, // Consider data fresh for 10 seconds
    },
  );

  const createRoomMutation = api.collaboration.createRoom.useMutation({
    onSuccess: () => void refetch(),
  });

  const joinRoomMutation = api.collaboration.joinRoom.useMutation();
  const leaveRoomMutation = api.collaboration.leaveRoom.useMutation({
    onSuccess: () => void refetch(),
  });

  useEffect(() => {
    if (roomsData?.rooms) {
      setRooms(roomsData.rooms);
    }
  }, [roomsData]);

  const createRoom = useCallback(
    (chatId: string, name: string) => {
      return createRoomMutation.mutateAsync({ chatId, name });
    },
    [createRoomMutation],
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      return joinRoomMutation.mutateAsync({ roomId });
    },
    [joinRoomMutation],
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      return leaveRoomMutation.mutateAsync({ roomId });
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

// Main hook that components should use
export function useCollaboration(roomId: string | null) {
  const user = useCollaborationUser();
  const rooms = useCollaborationRooms();
  const unified = useUnifiedCollaboration(roomId);

  // Create event handlers with proper error handling
  const addEventListener = useCallback(
    (
      eventType: CollaborationEventType,
      _handler: (event: CollaborationEvent) => void,
    ) => {
      console.log("Event listener added for:", eventType);
      // For now, just log - in a full implementation you'd store and process these
      return; // Explicitly return to prevent any issues
    },
    [],
  );

  const removeEventListener = useCallback(
    (
      eventType: CollaborationEventType,
      _handler: (event: CollaborationEvent) => void,
    ) => {
      console.log("Event listener removed for:", eventType);
      return; // Explicitly return to prevent any issues
    },
    [],
  );

  // Create a properly structured events object that matches the expected interface
  const events = {
    events: unified.events,
    addEventListener,
    removeEventListener,
  };

  return {
    user,
    rooms,
    messages: {
      messages: unified.messages,
      sendMessage: unified.sendMessage,
      editMessage: unified.editMessage,
      deleteMessage: unified.deleteMessage,
      isSending: unified.isSending,
      isEditing: unified.isEditing,
      isDeleting: unified.isDeleting,
      refetch: unified.refetch,
    },
    typing: {
      typingUsers: unified.typingUsers,
      startTyping: unified.startTyping,
      stopTyping: unified.stopTyping,
    },
    liveCoding: {
      session: unified.liveCodingSession,
      localContent: unified.localContent,
      isLiveCodingMode: unified.isLiveCodingMode,
      toggleLiveCodingMode: unified.toggleLiveCodingMode,
      updateCode: unified.updateCode,
      isToggling: unified.isToggling,
      isUpdating: unified.isUpdating,
      lastSyncTime: unified.lastSyncTime,
    },
    presence: {
      onlineUsers: unified.onlineUsers,
      onlineCount: unified.onlineUsers.length,
    },
    events,
  };
}
