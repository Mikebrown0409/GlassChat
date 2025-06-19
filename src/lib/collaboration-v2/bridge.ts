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

      // Prevent AI from responding to its own messages
      if (isSendingToAI) {
        console.log("🚫 AI is already generating a response, skipping");
        return;
      }

      // Check if this is a request to respond to an AI message (prevent loops)
      try {
        const { db } = await import("~/lib/db");
        const recentMessages = await db.messages
          .where("chatId")
          .equals(bridgedRoom.chatId)
          .reverse()
          .limit(3) // Check last 3 messages
          .toArray();

        // Only block if the current user message content suggests it's responding to an AI message
        // or if we detect rapid consecutive AI responses (potential loop)
        if (recentMessages.length >= 2) {
          const lastMessage = recentMessages[0];
          const secondLastMessage = recentMessages[1];

          // Check for potential loop: two consecutive AI messages within a short time
          if (
            lastMessage?.role === "assistant" &&
            secondLastMessage?.role === "assistant" &&
            Date.now() - lastMessage.createdAt < 5000 // 5 seconds
          ) {
            console.log(
              "🚫 Detected potential AI message loop, skipping response",
            );
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to check recent messages:", error);
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

        // Send user message to collaboration room so other users can see it
        await pusherCollab.sendMessage({
          type: "chat_message",
          content: content,
          sender: participantName,
          timestamp: Date.now(),
        });

        // Add user message to memory immediately
        await memoryManagerClient.addMemory(chatId, content, {
          role: "user",
        });

        // Get recent conversation history directly from database (like regular chat does)
        let conversationHistory: Array<{
          role: "user" | "assistant" | "system";
          content: string;
        }> = [];

        try {
          // Get recent messages from the database directly
          const { db } = await import("~/lib/db");
          const recentMessages = await db.messages
            .where("chatId")
            .equals(chatId)
            .reverse()
            .limit(20) // Get last 20 messages for context
            .toArray();

          // Convert to conversation format (oldest first)
          conversationHistory = recentMessages
            .reverse()
            .filter((msg) => msg.role !== "system") // Skip system messages
            .map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            }));

          console.log(
            "🧠 Loaded conversation history:",
            conversationHistory.length,
            "messages",
          );
        } catch (error) {
          console.warn("Failed to load conversation history:", error);
        }

        // Get updated memory context for system prompt (AFTER adding current message)
        let memoryContext = "";
        try {
          // Check if we should update the summary first
          const memories = await memoryManagerClient.getMemories(chatId);

          // Update summary more frequently - every 2 messages instead of 4
          if (memories.length > 0 && memories.length % 2 === 0) {
            console.log("🔄 Updating memory summary...");
            const historyString = memories
              .slice(-10) // Last 10 memories for context
              .map((m) => {
                const role = (m.metadata as { role?: string })?.role ?? "user";
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

          // Now get the (potentially updated) summary
          const summary = await memoryManagerClient.getSummary(chatId);
          if (summary) {
            memoryContext = `\n\nConversation Context: ${summary.summary}\nKey Topics: ${summary.keywords.join(", ")}\n\n`;
            console.log("🧠 Using memory context:", summary.summary);
          } else {
            console.log("🧠 No memory summary found for chatId:", chatId);
          }
        } catch (memoryError) {
          console.warn("Failed to get memory context:", memoryError);
        }

        // Use the same system prompt as regular chat
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

        // Prepare messages exactly like regular chat does
        const preparedMessages: Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }> = [
          { role: "system" as const, content: systemPrompt },
          ...conversationHistory,
          { role: "user" as const, content: content },
        ];

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

          // Handle large messages with proper table-aware chunking
          const maxMessageSize = 8000; // Leave buffer below 10KB limit

          if (assistantContent.length > maxMessageSize) {
            console.log(
              "📦 Message is large, chunking for Pusher:",
              assistantContent.length,
              "chars",
            );

            // Improved chunking that preserves code blocks and tables
            const chunks = [];
            let currentChunk = "";

            // First, split at major section boundaries (headers)
            const majorSections = assistantContent.split(/(?=\n#{1,3}\s)/);

            for (const section of majorSections) {
              // Check if this section would fit in current chunk
              if (currentChunk.length + section.length + 2 <= maxMessageSize) {
                currentChunk += (currentChunk ? "\n" : "") + section;
                continue;
              }

              // Current chunk + section is too big, save current chunk if it exists
              if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
              }

              // If the section itself is too big, we need to split it more carefully
              if (section.length > maxMessageSize) {
                // Check for code blocks first (they should never be split)
                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeBlocks = section.match(codeBlockRegex) ?? [];

                // If section has code blocks, try to keep them intact
                if (codeBlocks.length > 0) {
                  // Split section while preserving code blocks
                  let remainingSection = section;
                  let tempChunk = "";

                  // Process each code block
                  for (const codeBlock of codeBlocks) {
                    const beforeBlock = remainingSection.substring(
                      0,
                      remainingSection.indexOf(codeBlock),
                    );
                    const afterBlock = remainingSection.substring(
                      remainingSection.indexOf(codeBlock) + codeBlock.length,
                    );

                    // Add content before code block
                    if (beforeBlock.trim()) {
                      if (
                        tempChunk.length + beforeBlock.length + 2 <=
                        maxMessageSize
                      ) {
                        tempChunk +=
                          (tempChunk ? "\n\n" : "") + beforeBlock.trim();
                      } else {
                        if (tempChunk.trim()) {
                          chunks.push(tempChunk.trim());
                        }
                        tempChunk = beforeBlock.trim();
                      }
                    }

                    // Add code block (keep intact)
                    if (
                      tempChunk.length + codeBlock.length + 2 <=
                      maxMessageSize
                    ) {
                      tempChunk += (tempChunk ? "\n\n" : "") + codeBlock;
                    } else {
                      // Code block is too big for current chunk
                      if (tempChunk.trim()) {
                        chunks.push(tempChunk.trim());
                      }

                      // If code block itself is too big, we have a problem but still add it
                      if (codeBlock.length > maxMessageSize) {
                        console.warn(
                          "📦 Code block exceeds size limit, adding anyway:",
                          codeBlock.length,
                        );
                      }
                      tempChunk = codeBlock;
                    }

                    remainingSection = afterBlock;
                  }

                  // Add any remaining content
                  if (remainingSection.trim()) {
                    if (
                      tempChunk.length + remainingSection.length + 2 <=
                      maxMessageSize
                    ) {
                      tempChunk +=
                        (tempChunk ? "\n\n" : "") + remainingSection.trim();
                    } else {
                      if (tempChunk.trim()) {
                        chunks.push(tempChunk.trim());
                      }
                      tempChunk = remainingSection.trim();
                    }
                  }

                  currentChunk = tempChunk;
                } else {
                  // No code blocks, check for tables
                  const hasTable =
                    section.includes("|") && /\|.*\|.*\|/m.exec(section);

                  if (hasTable) {
                    // For table sections, split at paragraph boundaries but keep tables intact
                    const paragraphs = section.split(/\n\s*\n/);
                    let tempChunk = "";
                    let currentTable = "";
                    let inTable = false;

                    for (const paragraph of paragraphs) {
                      // Check if this paragraph is part of a table
                      const isTablePart =
                        paragraph.includes("|") && /\|.*\|/m.exec(paragraph);

                      if (isTablePart) {
                        if (!inTable) {
                          inTable = true;
                          currentTable = paragraph;
                        } else {
                          currentTable += "\n\n" + paragraph;
                        }
                      } else {
                        // Not a table part
                        if (inTable) {
                          // End of table, try to add the complete table
                          if (
                            tempChunk.length + currentTable.length + 4 <=
                            maxMessageSize
                          ) {
                            tempChunk +=
                              (tempChunk ? "\n\n" : "") + currentTable;
                          } else {
                            // Table is too big for current chunk, save current and start new
                            if (tempChunk.trim()) {
                              chunks.push(tempChunk.trim());
                            }
                            tempChunk = currentTable;
                          }
                          currentTable = "";
                          inTable = false;
                        }

                        // Add regular paragraph
                        if (
                          tempChunk.length + paragraph.length + 4 <=
                          maxMessageSize
                        ) {
                          tempChunk += (tempChunk ? "\n\n" : "") + paragraph;
                        } else {
                          if (tempChunk.trim()) {
                            chunks.push(tempChunk.trim());
                          }
                          tempChunk = paragraph;
                        }
                      }
                    }

                    // Handle any remaining table
                    if (inTable && currentTable) {
                      if (
                        tempChunk.length + currentTable.length + 4 <=
                        maxMessageSize
                      ) {
                        tempChunk += (tempChunk ? "\n\n" : "") + currentTable;
                      } else {
                        if (tempChunk.trim()) {
                          chunks.push(tempChunk.trim());
                        }
                        tempChunk = currentTable;
                      }
                    }

                    currentChunk = tempChunk;
                  } else {
                    // No tables or code blocks, use simpler paragraph-based splitting
                    const paragraphs = section.split(/\n\s*\n/);
                    for (const paragraph of paragraphs) {
                      if (
                        currentChunk.length + paragraph.length + 4 >
                        maxMessageSize
                      ) {
                        if (currentChunk.trim()) {
                          chunks.push(currentChunk.trim());
                        }
                        currentChunk = paragraph;
                      } else {
                        currentChunk +=
                          (currentChunk ? "\n\n" : "") + paragraph;
                      }
                    }
                  }
                }
              } else {
                // Section fits, use it as current chunk
                currentChunk = section;
              }
            }

            // Add the last chunk
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }

            console.log("📦 Split into", chunks.length, "chunks");

            // Send chunks with proper labeling and delays
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const isLastChunk = i === chunks.length - 1;
              const chunkPrefix =
                chunks.length > 1 ? `[${i + 1}/${chunks.length}] ` : "";

              try {
                await pusherCollab.sendMessage({
                  type: "chat_message",
                  content: chunkPrefix + chunk,
                  sender: "AI Assistant",
                  timestamp: Date.now(),
                });

                console.log(
                  `✅ Sent chunk ${i + 1}/${chunks.length} (${chunk?.length ?? 0} chars)`,
                );

                // Small delay between chunks to ensure proper ordering
                if (!isLastChunk) {
                  await new Promise((resolve) => setTimeout(resolve, 150));
                }
              } catch (chunkError) {
                console.error(
                  `❌ Failed to send chunk ${i + 1}/${chunks.length}:`,
                  chunkError,
                );
                // Continue with next chunk instead of failing completely
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
