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

        // Add user message to memory BEFORE getting context (fix timing issue)
        await memoryManagerClient.addMemory(chatId, content, { role: "user" });

        // Send collaboration message so other users see the user's message
        await pusherCollab.sendMessage({
          type: "chat_message",
          content: content,
          sender: participantName,
          timestamp: Date.now(),
        });

        // Get memory context for the AI AFTER adding current message
        let memoryContext = "";
        let hasMemoryContext = false;
        try {
          const summary = await memoryManagerClient.getSummary(chatId);
          if (summary) {
            memoryContext = `\n\nConversation Context: ${summary.summary}\nKey Topics: ${summary.keywords.join(", ")}\n\n`;
            hasMemoryContext = true;
            console.log("🧠 Using memory context:", summary.summary);
          } else {
            console.log("🧠 No memory summary found for chatId:", chatId);
          }
        } catch (memoryError) {
          console.warn("Failed to get memory context:", memoryError);
        }

        // Use the same clean system prompt as regular chat, but adapted for collaboration
        const systemPrompt = `You are a helpful, clear, and professional AI assistant.${memoryContext}

Follow these RESPONSE STYLE GUIDELINES for **every** reply unless explicitly instructed otherwise:
1. **Structure & Formatting**
   • Start with bold section headings (e.g., **Overview**, **Step-by-Step**).
   • Use numbered lists for processes, bullets for unordered data, and Markdown tables for comparisons or timelines.
   • Insert blank lines between paragraphs/sections for readability.
2. **Visual Hierarchy**
   • Bold section headers; *italicize* emphasis sparingly.
   • Use \`inline code\` for commands or variables.
   • Keep paragraphs ≤ 4 lines.
3. **Tables**
   • Include bold header rows.
   • Ensure columns are aligned and tables are not split across multiple code blocks.
4. **Tone & Readability**
   • Friendly yet professional, no fluff.
   • Break down complex topics into plain English first, then dive deeper.
   • End with a ✅ **Summary** section when appropriate.
5. **Conversation Memory**
   • Reference prior context and maintain continuity.
6. **Optional Enhancements**
   • Emojis (📌, ✅) only when they add clarity.
   • Collapsible sections if supported.

Always apply these rules while answering based on the provided message history.`;

        // Get recent messages for additional context (especially if no memory summary)
        let recentMessagesContext = "";
        try {
          const recentMemories = await memoryManagerClient.getMemories(chatId);
          if (recentMemories.length > 0) {
            // Get more recent messages if no summary, fewer if we have summary
            const contextSize = hasMemoryContext ? 4 : 8;
            const lastFewMemories = recentMemories.slice(-contextSize);

            // Filter out chunked messages to avoid confusion
            const cleanMemories = lastFewMemories.filter((m) => {
              const content = m.content;
              // Skip messages that look like chunks (start with [X/Y])
              return !/^\[\d+\/\d+\]\s/.exec(content);
            });

            recentMessagesContext = cleanMemories
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

        // Prepare messages - use actual conversation history from memory
        const preparedMessages: Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }> = [{ role: "system" as const, content: systemPrompt }];

        // Add recent conversation context if available
        if (recentMessagesContext) {
          // Parse recent messages into proper conversation format
          const recentLines = recentMessagesContext.split("\n");
          for (const line of recentLines) {
            if (line.startsWith("user: ")) {
              preparedMessages.push({
                role: "user" as const,
                content: line.substring(6), // Remove "user: " prefix
              });
            } else if (line.startsWith("assistant: ")) {
              preparedMessages.push({
                role: "assistant" as const,
                content: line.substring(11), // Remove "assistant: " prefix
              });
            }
          }
        }

        // Add the current user message (it's already been added to memory above)
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
          // Handle large messages by chunking them if they exceed Pusher's 10KB limit
          const maxMessageSize = 8000; // Leave some buffer below 10KB limit

          if (assistantContent.length > maxMessageSize) {
            // For table-heavy content, try to split at major sections instead of arbitrary lines
            const chunks = [];
            let currentChunk = "";
            const lines = assistantContent.split("\n");
            let inTable = false;
            let tableBuffer = "";

            for (const line of lines) {
              // Detect table start/end
              if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
                if (!inTable) {
                  inTable = true;
                  tableBuffer = line;
                } else {
                  tableBuffer += "\n" + line;
                }
                continue;
              } else if (inTable && line.trim() === "") {
                // End of table - add table as a unit
                inTable = false;

                // Check if adding the table would exceed limit
                if (
                  currentChunk.length + tableBuffer.length + 2 >
                  maxMessageSize
                ) {
                  // Save current chunk and start new one with table
                  if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                  }
                  currentChunk = tableBuffer + "\n";
                } else {
                  currentChunk +=
                    (currentChunk ? "\n" : "") + tableBuffer + "\n";
                }
                tableBuffer = "";
                continue;
              } else if (inTable) {
                tableBuffer += "\n" + line;
                continue;
              }

              // Regular line processing (not in table)
              // Try to split at major sections (## headers) when possible
              const isHeader = line.trim().startsWith("##");
              const isMajorBreak =
                line.trim().startsWith("**") && line.trim().endsWith("**");

              if (
                (isHeader || isMajorBreak) &&
                currentChunk.length > maxMessageSize * 0.7
              ) {
                // If we're near the limit and hit a good break point, split here
                if (currentChunk.trim()) {
                  chunks.push(currentChunk.trim());
                }
                currentChunk = line;
              } else if (
                currentChunk.length + line.length + 1 >
                maxMessageSize
              ) {
                // If adding this line would exceed the limit, save current chunk and start new one
                if (currentChunk.trim()) {
                  chunks.push(currentChunk.trim());
                }
                currentChunk = line;
              } else {
                currentChunk += (currentChunk ? "\n" : "") + line;
              }
            }

            // Handle any remaining table buffer
            if (inTable && tableBuffer) {
              if (
                currentChunk.length + tableBuffer.length + 1 >
                maxMessageSize
              ) {
                if (currentChunk.trim()) {
                  chunks.push(currentChunk.trim());
                }
                currentChunk = tableBuffer;
              } else {
                currentChunk += (currentChunk ? "\n" : "") + tableBuffer;
              }
            }

            // Add the last chunk
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }

            // Send chunks with a small delay between them
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const isLastChunk = i === chunks.length - 1;
              const chunkPrefix =
                chunks.length > 1 ? `[${i + 1}/${chunks.length}] ` : "";

              await pusherCollab.sendMessage({
                type: "chat_message",
                content: chunkPrefix + chunk,
                sender: "AI Assistant",
                timestamp: Date.now(),
              });

              // Small delay between chunks to ensure proper ordering
              if (!isLastChunk) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          } else {
            // Send single message if under size limit
            await pusherCollab.sendMessage({
              type: "chat_message",
              content: assistantContent,
              sender: "AI Assistant",
              timestamp: Date.now(),
            });
          }

          console.log("✅ AI response sent successfully");
        } else {
          throw new Error("AI response was not successful");
        }
      } catch (error) {
        console.error("Failed to send AI message:", error);

        // Send error message to collaboration (but keep it short to avoid same issue)
        try {
          await pusherCollab.sendMessage({
            type: "chat_message",
            content:
              "Sorry, I encountered an error while processing your message. Please try again.",
            sender: "AI Assistant",
            timestamp: Date.now(),
          });
        } catch (errorSendingError) {
          console.error("Failed to send error message:", errorSendingError);
        }
      } finally {
        setIsSendingToAI(false);
      }
    },
    isSendingToAI,
  };
}
