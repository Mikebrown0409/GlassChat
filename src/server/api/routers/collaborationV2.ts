// Simple Collaboration API Router
// Minimal endpoints for room management

import { z } from "zod";
import * as storage from "~/lib/collaboration-v2/storage";
import { createTRPCRouter, publicProcedure } from "../trpc";

// (legacy WebSocket gateway removed – replaced by SSE bus)

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
        const participant = storage.addParticipant(
          input.roomId,
          input.userName,
        );
        const updatedRoom = storage.getRoom(input.roomId);

        if (updatedRoom && participant) {
          console.log(
            `[CollabV2] Successfully joined room: ${input.roomId}, participants: ${updatedRoom.participants?.length ?? 0}`,
          );

          // Broadcast participant joined via SSE bus
          const { publishEvent } = await import("~/server/events/roomBus");
          publishEvent({
            type: "participant_joined",
            roomId: input.roomId,
            payload: { participant },
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

        // Broadcast via SSE bus
        const { publishEvent } = await import("~/server/events/roomBus");
        publishEvent({
          type: "participant_left",
          roomId: input.roomId,
          payload: { participantName: input.userId },
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
          sender: input.participantName,
          content: input.content,
          type: "user",
        });

        if (message) {
          console.log(`[CollabV2] Message sent successfully:`, message);

          // Broadcast via in-memory Event Bus (SSE)
          const { publishEvent } = await import("~/server/events/roomBus");
          publishEvent({
            type: "message",
            roomId: input.roomId,
            payload: { message },
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
});
