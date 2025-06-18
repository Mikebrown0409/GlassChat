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
  const [isSendingToAI, setIsSendingToAI] = useState(false);
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
    sendMessageToAI: async (content: string) => {
      if (!bridgedRoom?.chatId) {
        console.error("Cannot send AI message: no room chatId");
        return;
      }

      setIsSendingToAI(true);
      try {
        // Import required modules dynamically to avoid circular dependencies
        const { syncManager } = await import("~/lib/sync");
        const { AIModel } = await import("~/lib/ai/types");
        const { memoryManagerClient } = await import(
          "~/lib/memory/memoryManager-client"
        );

        const chatId = bridgedRoom.chatId;
        console.log("🤖 Sending AI message to shared chat:", chatId);

        // Create user message first
        await syncManager.createMessage(chatId, "user", content);

        // Add user message to memory
        await memoryManagerClient.addMemory(chatId, content, { role: "user" });

        // Send collaboration message so other users see the user's message
        await pusherCollab.sendMessage({
          type: "chat_message",
          content: content,
          sender: participantName,
          timestamp: Date.now(),
        });

        // Get memory context for the AI
        let memoryContext = "";
        try {
          const summary = await memoryManagerClient.getSummary(chatId);
          if (summary) {
            memoryContext = `\n\n**CONVERSATION MEMORY:**\nSummary: ${summary.summary}\nKey topics: ${summary.keywords.join(", ")}\n\n`;
            console.log("🧠 Using memory context:", summary.summary);
          } else {
            console.log("🧠 No memory summary found for chatId:", chatId);
          }
        } catch (memoryError) {
          console.warn("Failed to get memory context:", memoryError);
        }

        // Generate AI response using the same system as regular chat
        const systemPrompt = `You are a helpful, clear, and professional AI assistant integrated into a shared collaboration room.${memoryContext}Follow these RESPONSE STYLE GUIDELINES for **every** reply unless explicitly instructed otherwise:\n1. **Structure & Formatting**\n   • Start with bold section headings (e.g., **Overview**, **Step-by-Step**).\n   • Use numbered lists for processes, bullets for unordered data, and Markdown tables for comparisons or timelines.\n   • Insert blank lines between paragraphs/sections for readability.\n2. **Visual Hierarchy**\n   • Bold section headers; *italicize* emphasis sparingly.\n   • Use \`inline code\` for commands or variables.\n   • Keep paragraphs ≤ 4 lines.\n3. **Tables**\n   • Include bold header rows.\n   • Ensure columns are aligned and tables are not split across multiple code blocks.\n4. **Tone & Readability**\n   • Friendly yet professional, no fluff.\n   • Break down complex topics into plain English first, then dive deeper.\n   • End with a ✅ **Summary** section when appropriate.\n5. **Conversation Memory**\n   • Reference prior context and maintain continuity.\n   • Use the conversation memory above to provide personalized responses.\n6. **Optional Enhancements**\n   • Emojis (📌, ✅) only when they add clarity.\n   • Collapsible sections if supported.\n\nAlways apply these rules while answering based on the provided message history and conversation memory. Remember you are in a shared collaboration room where multiple users can see your responses.`;

        // Get recent messages for additional context
        let recentMessagesContext = "";
        try {
          const recentMemories = await memoryManagerClient.getMemories(chatId);
          if (recentMemories.length > 0) {
            const lastFewMemories = recentMemories.slice(-6); // Last 6 memories
            recentMessagesContext = lastFewMemories
              .map((m) => {
                const role = (m.metadata as { role?: string })?.role ?? "user";
                return `${role}: ${m.content}`;
              })
              .join("\n");
            console.log(
              "🧠 Recent conversation context:",
              recentMessagesContext,
            );
          }
        } catch (error) {
          console.warn("Failed to get recent memories:", error);
        }

        // Prepare messages with recent context if no summary available
        const preparedMessages: Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }> = [{ role: "system" as const, content: systemPrompt }];

        // Add recent conversation context if available
        if (recentMessagesContext) {
          preparedMessages.push({
            role: "system" as const,
            content: `Recent conversation context:\n${recentMessagesContext}`,
          });
        }

        preparedMessages.push({ role: "user" as const, content: content });

        // Use the API directly since we can't use the hook here
        const response = await fetch("/api/trpc/ai.generateResponse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: {
              model: AIModel.GEMINI_2_5_FLASH_LITE,
              messages: preparedMessages,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = (await response.json()) as {
          result?: {
            data?: {
              json?: {
                success?: boolean;
                response?: {
                  content?: string;
                };
              };
            };
          };
        };

        if (
          result.result?.data?.json?.success &&
          result.result.data.json.response?.content
        ) {
          const assistantContent = result.result.data.json.response.content;

          // Create AI assistant message in the database
          await syncManager.createMessage(
            chatId,
            "assistant",
            assistantContent,
          );

          // Add AI response to memory
          await memoryManagerClient.addMemory(chatId, assistantContent, {
            role: "assistant",
          });

          // Generate summary periodically (after every 2 messages like in regular chat)
          try {
            const memories = await memoryManagerClient.getMemories(chatId);
            if (memories.length > 0 && memories.length % 4 === 0) {
              // Every 4 memories (2 user + 2 assistant pairs)
              const historyString = memories
                .slice(-10) // Last 10 memories for context
                .map((m) => {
                  const role =
                    (m.metadata as { role?: string })?.role ?? "user";
                  return `${role}: ${m.content}`;
                })
                .join("\n");

              // Call the summarization API
              try {
                const response = await fetch(
                  "/api/trpc/memory.summarizeHistory",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      json: {
                        chatId,
                        history: historyString,
                      },
                    }),
                  },
                );

                if (response.ok) {
                  const result = (await response.json()) as {
                    result?: {
                      data?: {
                        json?: {
                          summary?: {
                            summary: string;
                            keywords: string[];
                          };
                        };
                      };
                    };
                  };
                  if (result.result?.data?.json?.summary) {
                    const summary = result.result.data.json.summary;
                    await memoryManagerClient.updateSummary(
                      chatId,
                      summary.summary,
                      summary.keywords,
                    );
                    console.log("📝 Updated conversation summary");
                  }
                }
              } catch (summaryError) {
                console.warn("Failed to generate summary:", summaryError);
              }
            }
          } catch (memoryError) {
            console.warn("Failed to check memory count:", memoryError);
          }

          // Send AI response as collaboration message so everyone sees it
          await pusherCollab.sendMessage({
            type: "chat_message",
            content: assistantContent,
            sender: "AI Assistant",
            timestamp: Date.now(),
          });

          console.log("✅ AI response sent successfully");
        } else {
          throw new Error("AI response was not successful");
        }
      } catch (error) {
        console.error("Failed to send AI message:", error);

        // Send error message to collaboration
        await pusherCollab.sendMessage({
          type: "chat_message",
          content:
            "Sorry, I encountered an error while processing your message. Please try again.",
          sender: "AI Assistant",
          timestamp: Date.now(),
        });
      } finally {
        setIsSendingToAI(false);
      }
    },
    isSendingToAI,
  };
}
