// Minimal Collaboration System Types
// Simple, focused types for core collaboration functionality

export interface Room {
  id: string;
  name: string;
  chatId: string; // The shared chat ID everyone talks in
  createdAt: string;
  participants: Participant[];
  lastActivity?: string;
}

export interface Participant {
  id: string;
  name: string;
  color?: string; // For avatar/cursor
  isOnline?: boolean;
  lastSeen?: string;
  joinedAt: string;
}

export interface RoomMessage {
  id: string;
  sender: string; // Updated from userId to sender
  content: string;
  timestamp: string;
  type: "user" | "ai"; // Updated from "message" | "join" | "leave" to "user" | "ai"
}

// WebSocket event types for V2
export type WSV2Update =
  | { type: "participant_joined"; roomId: string; participant: Participant }
  | { type: "participant_left"; roomId: string; participantId: string }
  | { type: "message_sent"; roomId: string; message: RoomMessage }
  | { type: "room_updated"; roomId: string; room: Room };

// Legacy WebSocket event types (keeping for backwards compatibility)
export type WSEvent =
  | { type: "user-joined"; data: { roomId: string; user: Participant } }
  | { type: "user-left"; data: { roomId: string; userId: string } }
  | { type: "message"; data: RoomMessage }
  | { type: "room-updated"; data: Room };

// API Response types
export interface CreateRoomResponse {
  success: boolean;
  room?: Room;
  error?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  room?: Room;
  error?: string;
}

// Pusher-specific types for real-time messaging
export interface CollaborationMessage {
  type: string;
  content: string;
  sender: string;
  timestamp: number;
}

export interface MessageSyncEvent {
  messageId: string;
  content: string;
  sender: string;
  timestamp: number;
  roomId: string;
}

export interface RoomStateEvent {
  roomId: string;
  participants: Participant[];
  lastActivity: number;
}
