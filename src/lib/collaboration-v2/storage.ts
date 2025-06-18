// Simple In-Memory Storage for Collaboration
// Can be replaced with Redis/Database later if needed

import { nanoid } from "nanoid";
import type { Participant, Room, RoomMessage } from "./types";

// Legacy compatibility types (for storage functions that haven't been migrated)
type CollaborationRoom = Room;

type CollaborationParticipant = Participant;

type CollaborationMessage = RoomMessage;

// In-memory storage
const rooms = new Map<string, Room>();
const messages = new Map<string, RoomMessage[]>(); // roomId -> messages
const userSessions = new Map<
  string,
  { userId: string; roomId: string; lastSeen: Date }
>();

// Helper to generate user colors
const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FECA57",
  "#FF9FF3",
  "#54A0FF",
  "#5F27CD",
  "#00D2D3",
  "#FF9F43",
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]!;
}

function generateColor(): string {
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];
  return colors[Math.floor(Math.random() * colors.length)] ?? "#3B82F6";
}

export function createRoom(roomId: string, name: string): CollaborationRoom {
  console.log("[Storage] Creating room with ID:", roomId);

  const existingRoom = rooms.get(roomId);
  if (existingRoom) {
    console.log("[Storage] Room already exists:", roomId);
    return existingRoom;
  }

  const room: CollaborationRoom = {
    id: roomId,
    name: name ?? `Room ${roomId}`,
    chatId: `shared-room-${roomId}`,
    participants: [],
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  rooms.set(roomId, room);
  messages.set(roomId, []);

  console.log("[Storage] Room created successfully:", roomId);
  return room;
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null;
}

export function addParticipant(
  roomId: string,
  participantName: string,
): CollaborationParticipant {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  // Check if participant already exists
  const existingParticipant = room.participants.find(
    (p) => p.name === participantName,
  );
  if (existingParticipant) {
    console.log("[Storage] Participant already exists:", participantName);
    return existingParticipant;
  }

  // Add new participant
  const participant: CollaborationParticipant = {
    id: nanoid(8),
    name: participantName,
    color: generateColor(),
    joinedAt: new Date().toISOString(),
  };

  room.participants.push(participant);
  room.lastActivity = new Date().toISOString();

  console.log(
    "[Storage] Added new participant",
    participantName,
    "to room",
    roomId,
  );
  return participant;
}

export function joinRoom(
  roomId: string,
  userName: string,
): { room: Room; participant: Participant } | null {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`[Storage] Room ${roomId} not found for join`);
    return null;
  }

  // Check if user already exists in room
  let participant = room.participants.find((p) => p.name === userName);

  if (!participant) {
    // Create new participant
    participant = {
      id: nanoid(8),
      name: userName,
      color: getRandomColor(),
      isOnline: true,
      lastSeen: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
    };
    room.participants.push(participant);
    console.log(
      `[Storage] Added new participant ${userName} to room ${roomId}`,
    );
  } else {
    // Mark existing participant as online
    participant.isOnline = true;
    participant.lastSeen = new Date().toISOString();
    console.log(
      `[Storage] Marked participant ${userName} as online in room ${roomId}`,
    );
  }

  // Update user session
  userSessions.set(participant.id, {
    userId: participant.id,
    roomId,
    lastSeen: new Date(),
  });

  rooms.set(roomId, room);
  return { room, participant };
}

export function leaveRoom(roomId: string, userId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const participant = room.participants.find((p) => p.id === userId);
  if (participant) {
    participant.isOnline = false;
    participant.lastSeen = new Date().toISOString();
  }

  userSessions.delete(userId);
  rooms.set(roomId, room);
  return room;
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

// Updated message functions
export function addMessage(
  roomId: string,
  message: Omit<CollaborationMessage, "id" | "timestamp">,
): CollaborationMessage {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const newMessage: CollaborationMessage = {
    id: nanoid(8),
    ...message,
    timestamp: new Date().toISOString(),
  };

  const roomMessages = messages.get(roomId) ?? [];
  roomMessages.push(newMessage);
  messages.set(roomId, roomMessages);

  // Update room activity
  room.lastActivity = new Date().toISOString();

  return newMessage;
}

export function getMessages(roomId: string): RoomMessage[] {
  return messages.get(roomId) ?? [];
}

export function cleanup() {
  // Clean up old sessions and offline users
  const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  for (const [sessionId, session] of userSessions.entries()) {
    if (session.lastSeen < cutoff) {
      leaveRoom(session.roomId, session.userId);
      userSessions.delete(sessionId);
    }
  }
}

// Clean up every minute
setInterval(cleanup, 60000);

// Export for use in tRPC
export const collaborationV2Storage = {
  createRoom,
  getRoom,
  addParticipant,
  joinRoom,
  leaveRoom,
  getAllRooms,
  addMessage,
  getMessages,
  cleanup,
};
 