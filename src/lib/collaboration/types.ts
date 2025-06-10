// Real-time collaboration types for GlassChat
// Supports room management, user presence, and live coding mode

export interface CollaborationUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string; // For cursor/selection highlighting
  isTyping?: boolean;
  lastSeen: number;
}

export interface CollaborationRoom {
  id: string;
  chatId: string;
  name: string;
  ownerId: string;
  users: CollaborationUser[];
  isLiveCodingMode: boolean;
  createdAt: number;
  lastActivity: number;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  roomId: string;
  timestamp: number;
}

export interface LiveCodingSession {
  id: string;
  roomId: string;
  content: string;
  cursors: Record<string, CursorPosition>;
  selections: Record<string, TextSelection>;
  version: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
}

export interface CursorPosition {
  userId: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface TextSelection {
  userId: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  timestamp: number;
}

export enum CollaborationEventType {
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left",
  USER_TYPING = "user_typing",
  USER_STOPPED_TYPING = "user_stopped_typing",
  MESSAGE_SENT = "message_sent",
  CURSOR_MOVED = "cursor_moved",
  TEXT_SELECTED = "text_selected",
  LIVE_CODE_UPDATED = "live_code_updated",
  MODE_SWITCHED = "mode_switched",
}

export interface CollaborationEvent {
  type: CollaborationEventType;
  roomId: string;
  userId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface CollaborationMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  timestamp: number;
  type: "text" | "system" | "code";
}

export interface UserPresence {
  userId: string;
  roomId: string;
  isOnline: boolean;
  lastSeen: number;
  isTyping: boolean;
}

// Configuration for collaboration features
export interface CollaborationConfig {
  maxUsersPerRoom: number;
  typingIndicatorTimeout: number;
  presenceHeartbeatInterval: number;
  liveCodingDebounceMs: number;
  enableVoiceChat: boolean;
  enableScreenShare: boolean;
}

export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  maxUsersPerRoom: 10,
  typingIndicatorTimeout: 3000, // 3 seconds
  presenceHeartbeatInterval: 30000, // 30 seconds
  liveCodingDebounceMs: 300, // 300ms debounce for live coding
  enableVoiceChat: false,
  enableScreenShare: false,
};

// Color palette for user cursors and selections
export const USER_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
] as const;

export type UserColor = (typeof USER_COLORS)[number];
