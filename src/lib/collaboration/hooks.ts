// React hooks for real-time collaboration features
// Uses tRPC for server communication and local state management

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import type {
  CollaborationRoom,
  CollaborationUser,
  CollaborationMessage,
  TypingIndicator,
  LiveCodingSession,
  UserPresence,
  CollaborationEvent,
  CollaborationEventType,
} from "./types";

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

  // Single API call that fetches ALL collaboration data
  const { data: roomData, refetch } = api.collaboration.getRoomData.useQuery(
    { roomId: roomId ?? "" },
    {
      enabled: !!roomId && !isUserTyping, // Don't fetch while user is typing
      refetchInterval: isUserTyping ? false : 15000, // Much slower: 15 seconds
      staleTime: 5000, // Consider data fresh for 5 seconds
    },
  );

  // Update local state when data arrives (but not while user is typing)
  useEffect(() => {
    if (roomData?.data && !isUserTyping) {
      const newData = roomData.data;

      setAllData({
        room: newData.room,
        messages: newData.messages || [],
        typingUsers: newData.typingUsers || [],
        onlineUsers: newData.onlineUsers || [],
        liveCodingSession: newData.liveCodingSession,
        events: newData.events || [],
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

  // Debounced code update with conflict prevention
  const updateCode = useCallback(
    (content: string, cursorPosition?: { line: number; column: number }) => {
      if (!roomId) return Promise.reject(new Error("No room selected"));

      // Update local state immediately for responsive UI
      setLocalContent(content);

      // Clear existing timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Mark user as typing immediately
      setIsUserTyping(true);

      // Set timeout to actually send the update (longer debounce)
      updateTimeoutRef.current = setTimeout(() => {
        updateCodeMutation
          .mutateAsync({ roomId, content, cursorPosition })
          .then(() => {
            // Stop typing indicator after successful update
            typingTimeoutRef.current = setTimeout(() => {
              setIsUserTyping(false);
            }, 1000);
          })
          .catch(() => {
            // Stop typing on error too
            setIsUserTyping(false);
          });
      }, 2000); // 2 second debounce - much longer to reduce calls

      return Promise.resolve();
    },
    [roomId, updateCodeMutation],
  );

  const sendMessage = useCallback(
    (content: string, type: "text" | "system" | "code" = "text") => {
      if (!roomId) return Promise.reject(new Error("No room selected"));
      return sendMessageMutation.mutateAsync({ roomId, content, type });
    },
    [roomId, sendMessageMutation],
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

  return {
    // All data in one object
    ...allData,

    // Live coding specific
    localContent,
    isLiveCodingMode: !!allData.liveCodingSession,

    // Actions
    updateCode,
    sendMessage,
    toggleLiveCodingMode,
    startTyping,
    stopTyping,

    // Status
    isUpdating: updateCodeMutation.isPending,
    isSending: sendMessageMutation.isPending,
    isToggling: toggleLiveCodingMutation.isPending,
    lastSyncTime,

    // Manual refresh (rarely needed)
    refetch,
  };
}

// Simplified hook for just user management (no polling)
export function useCollaborationUser() {
  const [user, setUser] = useState<CollaborationUser | null>(null);

  const { data: userData } = api.collaboration.getCurrentUser.useQuery();
  const createUserMutation = api.collaboration.createUser.useMutation({
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
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
    isSending: unified.isSending,
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
      isSending: unified.isSending,
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
