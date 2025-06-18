// Simple In-Memory Storage for Collaboration
// Can be replaced with Redis/Database later if needed

import { nanoid } from "nanoid";
import { Participant, Room, RoomMessage } from "./types";

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

export function createRoom(roomId: string, name?: string): Room {
  // Use provided roomId instead of generating random one
  const chatId = `room-${roomId}-${Date.now()}`;

  const room: Room = {
    id: roomId,
    name: name || roomId, // Use name if provided, otherwise use roomId as name
    chatId,
    createdAt: new Date().toISOString(),
    participants: [],
  };

  rooms.set(roomId, room);
  messages.set(roomId, []); // Initialize empty message array
  console.log(`[Storage] Created room with ID: ${roomId}`);
  return room;
}

export function getRoom(roomId: string): Room | null {
  return rooms.get(roomId) ?? null;
}

export function addParticipant(
  roomId: string,
  participant: Participant,
): Room | null {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`[Storage] Room ${roomId} not found for participant add`);
    return null;
  }

  // Check if user already exists in room
  let existingParticipant = room.participants.find(
    (p) => p.name === participant.name,
  );

  if (!existingParticipant) {
    // Create new participant with color
    const newParticipant: Participant = {
      ...participant,
      color: getRandomColor(),
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };
    room.participants.push(newParticipant);
    console.log(
      `[Storage] Added new participant ${participant.name} to room ${roomId}`,
    );
  } else {
    // Mark existing participant as online
    existingParticipant.isOnline = true;
    existingParticipant.lastSeen = new Date().toISOString();
    console.log(
      `[Storage] Marked participant ${participant.name} as online in room ${roomId}`,
    );
  }

  // Update user session
  const participantToTrack = existingParticipant || participant;
  userSessions.set(participantToTrack.id, {
    userId: participantToTrack.id,
    roomId,
    lastSeen: new Date(),
  });

  rooms.set(roomId, room);
  return room;
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
  message:
    | Omit<RoomMessage, "id">
    | { sender: string; content: string; timestamp?: string; type?: string },
): RoomMessage | null {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`[Storage] Room ${roomId} not found for message`);
    return null;
  }

  const fullMessage: RoomMessage = {
    id: "id" in message ? message.id : nanoid(8),
    sender: message.sender,
    content: message.content,
    timestamp: message.timestamp || new Date().toISOString(),
    type: ("type" in message ? message.type : "user") as "user" | "ai",
  };

  let roomMessages = messages.get(roomId);
  if (!roomMessages) {
    roomMessages = [];
    messages.set(roomId, roomMessages);
  }

  roomMessages.push(fullMessage);

  // Keep only last 100 messages per room to prevent memory bloat
  if (roomMessages.length > 100) {
    roomMessages.splice(0, roomMessages.length - 100);
  }

  return fullMessage;
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
