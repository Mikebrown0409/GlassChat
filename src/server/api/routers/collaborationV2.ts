// Simple Collaboration API Router
// Minimal endpoints for room management

import { z } from "zod";
import { generateAIResponse } from "~/lib/ai/models";
import { AIModel } from "~/lib/ai/types";
import * as storage from "~/lib/collaboration-v2/storage";
import { wsGateway } from "~/server/ws/gateway";
import { createTRPCRouter, publicProcedure } from "../trpc";

// Helper function to broadcast WebSocket messages (import the gateway)
function broadcastToRoom(roomId: string, message: any) {
  try {
    // Import dynamically to avoid potential circular dependencies
    const { startCollaborationGateway } = require("~/server/ws/gateway");
    const wss = startCollaborationGateway();

    if (wss && wss.clients) {
      wss.clients.forEach((client: any) => {
        if (
          client.readyState === 1 && // WebSocket.OPEN
          client._roomId === roomId &&
          client._clientType === "v2"
        ) {
          client.send(JSON.stringify(message));
        }
      });
    }
  } catch (error) {
    console.warn("[CollabV2] Failed to broadcast WebSocket message:", error);
  }
}

export const collaborationV2Router = createTRPCRouter({
  createRoom: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        userName: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Generate a room ID for new rooms
        const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const room = storage.createRoom(roomId, input.name);
        const joinResult = storage.joinRoom(room.id, input.userName);

        if (!joinResult) {
          return { success: false, error: "Failed to join created room" };
        }

        return {
          success: true,
          room: joinResult.room,
          participant: joinResult.participant,
        };
      } catch (error) {
        console.error("Error creating room:", error);
        return { success: false, error: "Failed to create room" };
      }
    }),

  joinRoom: publicProcedure
    .input(
      z.object({
        roomId: z.string().min(1).max(50),
        userName: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          `[CollabV2] Attempting to join room: ${input.roomId} as ${input.userName}`,
        );

        // Check if room exists, if not create it
        const existingRoom = storage.getRoom(input.roomId);
        if (!existingRoom) {
          console.log(
            `[CollabV2] Room ${input.roomId} doesn't exist, creating it`,
          );
          storage.createRoom(input.roomId, `Room ${input.roomId}`);
        }

        // Add participant to room
        const updatedRoom = storage.addParticipant(input.roomId, {
          id: `${input.userName}-${Date.now()}`,
          name: input.userName,
          joinedAt: new Date().toISOString(),
        });

        if (updatedRoom) {
          console.log(
            `[CollabV2] Successfully joined room: ${input.roomId}, participants: ${updatedRoom.participants.length}`,
          );

          // Broadcast participant joined via WebSocket
          wsGateway.broadcastV2Message(input.roomId, {
            type: "participant_joined",
            roomId: input.roomId,
            participant: {
              id: `${input.userName}-${Date.now()}`,
              name: input.userName,
              joinedAt: new Date().toISOString(),
            },
          });

          return { success: true, room: updatedRoom };
        } else {
          console.error(`[CollabV2] Failed to join room: ${input.roomId}`);
          return { success: false, error: "Failed to join room" };
        }
      } catch (error) {
        console.error("[CollabV2] Join room error:", error);
        return { success: false, error: "Internal server error" };
      }
    }),

  leaveRoom: publicProcedure
    .input(
      z.object({
        roomId: z.string().min(1),
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const room = storage.leaveRoom(input.roomId, input.userId);

        // Broadcast to other participants
        broadcastToRoom(input.roomId, {
          type: "participant_left",
          roomId: input.roomId,
          data: { participantName: input.userId },
        });

        return { success: true, room };
      } catch (error) {
        console.error("Error leaving room:", error);
        return { success: false, error: "Failed to leave room" };
      }
    }),

  getRoom: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log(`[CollabV2] Getting room: ${input.roomId}`);
        const room = storage.getRoom(input.roomId);

        if (room) {
          console.log(
            `[CollabV2] Room found: Yes, ${room.participants.length} participants`,
          );
        } else {
          console.log(`[CollabV2] Room found: No`);
        }

        return { success: true, room };
      } catch (error) {
        console.error("[CollabV2] Get room error:", error);
        return { success: false, error: "Failed to get room", room: null };
      }
    }),

  getAllRooms: publicProcedure.query(async () => {
    try {
      const rooms = storage.getAllRooms();
      return { success: true, rooms };
    } catch (error) {
      console.error("Error getting rooms:", error);
      return { success: false, error: "Failed to get rooms" };
    }
  }),

  sendMessage: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        participantName: z.string(),
        content: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          `[CollabV2] Sending message in room: ${input.roomId} from ${input.participantName}`,
        );

        const message = storage.addMessage(input.roomId, {
          id: Math.random().toString(36).substr(2, 9),
          sender: input.participantName,
          content: input.content,
          timestamp: new Date().toISOString(),
          type: "user",
        });

        if (message) {
          console.log(`[CollabV2] Message sent successfully:`, message);

          // Broadcast message via WebSocket
          wsGateway.broadcastV2Message(input.roomId, {
            type: "message_sent",
            roomId: input.roomId,
            message,
          });

          return { success: true, message };
        } else {
          return { success: false, error: "Failed to send message" };
        }
      } catch (error) {
        console.error("[CollabV2] Send message error:", error);
        return { success: false, error: "Internal server error" };
      }
    }),

  sendMessageToAI: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        participantName: z.string(),
        content: z.string().min(1).max(5000),
        model: z.nativeEnum(AIModel).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          `[CollabV2] Sending message to AI in room: ${input.roomId} from ${input.participantName}`,
        );

        // Add user message first
        const userMessage = storage.addMessage(input.roomId, {
          id: Math.random().toString(36).substr(2, 9),
          sender: input.participantName,
          content: input.content,
          timestamp: new Date().toISOString(),
          type: "user",
        });

        if (!userMessage) {
          return { success: false, error: "Failed to send user message" };
        }

        // Broadcast user message via WebSocket
        wsGateway.broadcastV2Message(input.roomId, {
          type: "message_sent",
          roomId: input.roomId,
          message: userMessage,
        });

        // Get recent messages for context
        const messages = storage.getMessages(input.roomId);
        const recentMessages = messages.slice(-10); // Last 10 messages for context

        // Prepare AI messages
        const aiMessages = [
          {
            role: "system" as const,
            content: `You are an AI assistant helping in a collaborative chat room. Current participants: ${input.participantName} and others. Provide helpful, clear responses. Keep responses concise but informative.`,
          },
          ...recentMessages
            .filter((msg) => msg.type === "user")
            .map((msg) => ({
              role: "user" as const,
              content: `${msg.sender}: ${msg.content}`,
            })),
        ];

        // Generate AI response
        const aiModel = input.model ?? AIModel.GEMINI_2_5_FLASH_LITE;
        const response = await generateAIResponse(aiModel, aiMessages, {
          maxTokens: 1000,
          temperature: 0.7,
        });

        if (response?.content) {
          // Add AI response message
          const aiMessage = storage.addMessage(input.roomId, {
            id: Math.random().toString(36).substr(2, 9),
            sender: "AI Assistant",
            content: response.content,
            timestamp: new Date().toISOString(),
            type: "ai",
          });

          if (aiMessage) {
            console.log(`[CollabV2] AI response sent successfully:`, aiMessage);

            // Broadcast AI message via WebSocket
            wsGateway.broadcastV2Message(input.roomId, {
              type: "message_sent",
              roomId: input.roomId,
              message: aiMessage,
            });

            return {
              success: true,
              userMessage,
              aiMessage,
              usage: response.usage,
            };
          }
        }

        return { success: false, error: "Failed to generate AI response" };
      } catch (error) {
        console.error("[CollabV2] Send message to AI error:", error);
        return { success: false, error: "Internal server error" };
      }
    }),

  getMessages: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log(`[CollabV2] Getting messages for room: ${input.roomId}`);
        const messages = storage.getMessages(input.roomId);
        console.log(`[CollabV2] Found ${messages.length} messages`);
        return { success: true, messages };
      } catch (error) {
        console.error("[CollabV2] Get messages error:", error);
        return {
          success: false,
          error: "Failed to get messages",
          messages: [],
        };
      }
    }),
});
