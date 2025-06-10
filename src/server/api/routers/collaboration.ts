// tRPC Collaboration Router - Type-safe API endpoints for real-time collaboration
// Provides room management, live coding, and messaging features

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { collaborationManager } from "~/lib/collaboration/collaborationManager";
import {
  type CollaborationRoom,
  type CollaborationUser,
  type CollaborationMessage,
  type LiveCodingSession,
  type TypingIndicator,
  type UserPresence,
  type CollaborationEvent,
} from "~/lib/collaboration/types";

// Input validation schemas
const CreateUserSchema = z.object({
  name: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
});

const CreateRoomSchema = z.object({
  chatId: z.string().min(1),
  name: z.string().min(1).max(100),
});

const JoinRoomSchema = z.object({
  roomId: z.string().min(1),
});

const SendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(5000),
  type: z.enum(["text", "system", "code"]).default("text"),
});

const UpdateLiveCodeSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().max(100000),
  cursorPosition: z
    .object({
      line: z.number().min(0),
      column: z.number().min(0),
    })
    .optional(),
});

const PollEventsSchema = z.object({
  roomId: z.string().min(1),
  since: z.number().min(0).default(0),
});

export const collaborationRouter = createTRPCRouter({
  // User Management
  createUser: publicProcedure.input(CreateUserSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      user?: CollaborationUser;
      error?: string;
    }> => {
      try {
        const user = await collaborationManager.createUser(
          input.name,
          input.avatarUrl,
        );
        return {
          success: true,
          user,
        };
      } catch (error) {
        console.error("Error creating user:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create user",
        };
      }
    },
  ),

  getCurrentUser: publicProcedure.query(
    async (): Promise<{
      success: boolean;
      user?: CollaborationUser;
    }> => {
      const user = collaborationManager.getCurrentUser();
      return {
        success: true,
        user: user ?? undefined,
      };
    },
  ),

  // Room Management
  createRoom: publicProcedure.input(CreateRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      room?: CollaborationRoom;
      error?: string;
    }> => {
      try {
        const room = await collaborationManager.createRoom(
          input.chatId,
          input.name,
        );
        return {
          success: true,
          room,
        };
      } catch (error) {
        console.error("Error creating room:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create room",
        };
      }
    },
  ),

  joinRoom: publicProcedure.input(JoinRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      room?: CollaborationRoom;
      error?: string;
    }> => {
      try {
        const room = await collaborationManager.joinRoom(input.roomId);
        return {
          success: true,
          room,
        };
      } catch (error) {
        console.error("Error joining room:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to join room",
        };
      }
    },
  ),

  leaveRoom: publicProcedure.input(JoinRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        await collaborationManager.leaveRoom(input.roomId);
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error leaving room:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to leave room",
        };
      }
    },
  ),

  getRooms: publicProcedure.query(
    async (): Promise<{
      success: boolean;
      rooms: CollaborationRoom[];
      error?: string;
    }> => {
      try {
        const rooms = await collaborationManager.getRooms();
        return {
          success: true,
          rooms,
        };
      } catch (error) {
        console.error("Error getting rooms:", error);
        return {
          success: false,
          rooms: [],
          error: error instanceof Error ? error.message : "Failed to get rooms",
        };
      }
    },
  ),

  // Live Coding Mode
  toggleLiveCodingMode: publicProcedure.input(JoinRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      isLiveCodingMode?: boolean;
      error?: string;
    }> => {
      try {
        const isLiveCodingMode =
          await collaborationManager.toggleLiveCodingMode(input.roomId);
        return {
          success: true,
          isLiveCodingMode,
        };
      } catch (error) {
        console.error("Error toggling live coding mode:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to toggle live coding mode",
        };
      }
    },
  ),

  updateLiveCode: publicProcedure.input(UpdateLiveCodeSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        const cursorPosition = input.cursorPosition
          ? {
              userId: collaborationManager.getCurrentUser()?.id ?? "",
              line: input.cursorPosition.line,
              column: input.cursorPosition.column,
              timestamp: Date.now(),
            }
          : undefined;

        await collaborationManager.updateLiveCode(
          input.roomId,
          input.content,
          cursorPosition,
        );

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error updating live code:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update live code",
        };
      }
    },
  ),

  getLiveCodingSession: publicProcedure.input(JoinRoomSchema).query(
    async ({
      input,
    }): Promise<{
      success: boolean;
      session?: LiveCodingSession;
      error?: string;
    }> => {
      try {
        const session = await collaborationManager.getLiveCodingSession(
          input.roomId,
        );
        return {
          success: true,
          session: session ?? undefined,
        };
      } catch (error) {
        console.error("Error getting live coding session:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get live coding session",
        };
      }
    },
  ),

  // Messaging
  sendMessage: publicProcedure.input(SendMessageSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      message?: CollaborationMessage;
      error?: string;
    }> => {
      try {
        const message = await collaborationManager.sendMessage(
          input.roomId,
          input.content,
          input.type,
        );
        return {
          success: true,
          message,
        };
      } catch (error) {
        console.error("Error sending message:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to send message",
        };
      }
    },
  ),

  getMessages: publicProcedure.input(JoinRoomSchema).query(
    async ({
      input,
    }): Promise<{
      success: boolean;
      messages: CollaborationMessage[];
      error?: string;
    }> => {
      try {
        const messages = await collaborationManager.getMessages(input.roomId);
        return {
          success: true,
          messages,
        };
      } catch (error) {
        console.error("Error getting messages:", error);
        return {
          success: false,
          messages: [],
          error:
            error instanceof Error ? error.message : "Failed to get messages",
        };
      }
    },
  ),

  // Typing Indicators
  startTyping: publicProcedure.input(JoinRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        await collaborationManager.startTyping(input.roomId);
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error starting typing:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to start typing",
        };
      }
    },
  ),

  stopTyping: publicProcedure.input(JoinRoomSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        await collaborationManager.stopTyping(input.roomId);
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error stopping typing:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to stop typing",
        };
      }
    },
  ),

  getTypingUsers: publicProcedure
    .input(JoinRoomSchema)
    .query(async ({ input }) => {
      try {
        const typingUsers = await collaborationManager.getTypingUsers(
          input.roomId,
        );
        return {
          success: true,
          typingUsers,
        };
      } catch (error) {
        console.error("Error getting typing users:", error);
        return {
          success: false,
          typingUsers: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to get typing users",
        };
      }
    }),

  // Event Polling (for real-time updates)
  pollEvents: publicProcedure
    .input(PollEventsSchema)
    .query(async ({ input }) => {
      try {
        const events = await collaborationManager.pollEvents(
          input.roomId,
          input.since,
        );
        return {
          success: true,
          events,
        };
      } catch (error) {
        console.error("Error polling events:", error);
        return {
          success: false,
          events: [],
          error:
            error instanceof Error ? error.message : "Failed to poll events",
        };
      }
    }),

  // Presence
  getOnlineUsers: publicProcedure
    .input(JoinRoomSchema)
    .query(async ({ input }) => {
      try {
        const onlineUsers = await collaborationManager.getOnlineUsers(
          input.roomId,
        );
        return {
          success: true,
          onlineUsers,
        };
      } catch (error) {
        console.error("Error getting online users:", error);
        return {
          success: false,
          onlineUsers: [],
          error:
            error instanceof Error
              ? error.message
              : "Failed to get online users",
        };
      }
    }),

  // Cleanup
  cleanup: publicProcedure.mutation(
    async (): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        await collaborationManager.cleanup();
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error during cleanup:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to cleanup",
        };
      }
    },
  ),

  // *** NEW UNIFIED ENDPOINT - Fetch all room data in one call ***
  getRoomData: publicProcedure.input(JoinRoomSchema).query(
    async ({
      input,
    }): Promise<{
      success: boolean;
      data?: {
        room?: CollaborationRoom;
        messages: CollaborationMessage[];
        typingUsers: TypingIndicator[];
        onlineUsers: UserPresence[];
        liveCodingSession?: LiveCodingSession;
        events: CollaborationEvent[];
      };
      error?: string;
    }> => {
      try {
        // Fetch all data in parallel for maximum efficiency
        const [
          roomsResult,
          messagesResult,
          typingUsersResult,
          onlineUsersResult,
          liveCodingResult,
          eventsResult,
        ] = await Promise.all([
          collaborationManager.getRooms(),
          collaborationManager.getMessages(input.roomId),
          collaborationManager.getTypingUsers(input.roomId),
          collaborationManager.getOnlineUsers(input.roomId),
          collaborationManager.getLiveCodingSession(input.roomId),
          collaborationManager.pollEvents(input.roomId, 0), // Get recent events
        ]);

        const room = roomsResult.find((r) => r.id === input.roomId);

        return {
          success: true,
          data: {
            room,
            messages: messagesResult,
            typingUsers: typingUsersResult,
            onlineUsers: onlineUsersResult,
            liveCodingSession: liveCodingResult ?? undefined,
            events: eventsResult,
          },
        };
      } catch (error) {
        console.error("Error getting room data:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get room data",
        };
      }
    },
  ),
});
