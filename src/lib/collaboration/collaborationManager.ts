// Real-time collaboration manager for GlassChat
// Uses existing Upstash Redis infrastructure for real-time sync

import { nanoid } from "nanoid";
import { redis } from "../sync/redis";
import {
  type CollaborationConfig,
  type CollaborationEvent,
  CollaborationEventType,
  type CollaborationMessage,
  type CollaborationRoom,
  type CollaborationUser,
  type CursorPosition,
  DEFAULT_COLLABORATION_CONFIG,
  type LiveCodingSession,
  Role,
  type TypingIndicator,
  USER_COLORS,
  type UserPresence,
} from "./types";

class CollaborationManager {
  private config: CollaborationConfig;
  private currentUser: CollaborationUser | null = null;
  private currentRoom: string | null = null;
  private eventHandlers: Map<
    CollaborationEventType,
    Set<(event: CollaborationEvent) => void>
  > = new Map<
    CollaborationEventType,
    Set<(event: CollaborationEvent) => void>
  >();
  private presenceInterval: NodeJS.Timeout | null = null;
  private typingTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<CollaborationConfig> = {}) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.initializeEventHandlers();
  }

  private initializeEventHandlers() {
    // Initialize event handler maps
    Object.values(CollaborationEventType).forEach((eventType) => {
      this.eventHandlers.set(eventType, new Set());
    });
  }

  // User Management
  async createUser(
    name: string,
    avatarUrl?: string,
    role: Role = Role.PARTICIPANT,
  ): Promise<CollaborationUser> {
    const user: CollaborationUser = {
      id: nanoid(),
      name,
      avatarUrl,
      color: USER_COLORS[
        Math.floor(Math.random() * USER_COLORS.length)
      ] as string,
      lastSeen: Date.now(),
      role,
    };

    this.currentUser = user;
    return user;
  }

  getCurrentUser(): CollaborationUser | null {
    return this.currentUser;
  }

  // Room Management
  async createRoom(chatId: string, name: string): Promise<CollaborationRoom> {
    if (!this.currentUser) {
      throw new Error("Must have a current user to create room");
    }

    const room: CollaborationRoom = {
      id: nanoid(),
      chatId,
      name,
      ownerId: this.currentUser.id,
      users: [this.currentUser],
      isLiveCodingMode: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Store room in Redis
    await redis.set(`collaboration:room:${room.id}`, JSON.stringify(room));

    // Add to room index
    await redis.sadd("collaboration:rooms", room.id);

    // Set current room and start presence for creator
    this.currentRoom = room.id;
    this.startPresenceHeartbeat(room.id);

    // Publish room created event
    await this.publishEvent({
      type: CollaborationEventType.USER_JOINED,
      roomId: room.id,
      userId: this.currentUser.id,
      data: { user: this.currentUser, room },
      timestamp: Date.now(),
    });

    return room;
  }

  async joinRoom(roomId: string): Promise<CollaborationRoom> {
    if (!this.currentUser) {
      throw new Error("Must have a current user to join room");
    }

    // Get room from Redis
    const roomData = await redis.get(`collaboration:room:${roomId}`);
    let room: CollaborationRoom;

    if (!roomData || typeof roomData !== "string") {
      // Check if we're already trying to create this room to prevent race conditions
      const lockKey = `collaboration:room:lock:${roomId}`;
      const existingLock = await redis.get(lockKey);

      if (existingLock) {
        // Another process is creating the room, wait and try again
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryRoomData = await redis.get(`collaboration:room:${roomId}`);
        if (retryRoomData && typeof retryRoomData === "string") {
          room = JSON.parse(retryRoomData) as CollaborationRoom;
        } else {
          throw new Error("Room not found and could not be created");
        }
      } else {
        // Set a lock to prevent multiple creation attempts
        await redis.set(lockKey, "creating", { ex: 10 }); // 10 second expiration

        try {
          // In development with MockRedis, rooms might not persist across sessions
          // Create a placeholder room so users can still collaborate
          console.warn(
            `Room ${roomId} not found, creating placeholder room for development`,
          );

          room = {
            id: roomId,
            chatId: `shared-${roomId}`, // Use consistent shared chat ID pattern
            name: "Shared Room",
            ownerId: this.currentUser.id,
            users: [this.currentUser],
            isLiveCodingMode: false,
            createdAt: Date.now(),
            lastActivity: Date.now(),
          };

          // Store the placeholder room
          await redis.set(`collaboration:room:${roomId}`, JSON.stringify(room));
          await redis.sadd("collaboration:rooms", roomId);

          // Send a system message explaining the placeholder room
          await this.sendMessage(
            roomId,
            `🔗 Welcome to this shared collaboration room! This room was created from a shared link. You can now chat and collaborate with others who join via the same link.`,
            "system",
          );
        } finally {
          // Release the lock
          await redis.del(lockKey);
        }
      }
    } else {
      room = JSON.parse(roomData) as CollaborationRoom;
    }

    // Check room capacity
    if (room.users.length >= this.config.maxUsersPerRoom) {
      throw new Error("Room is full");
    }

    // Add user to room if not already present
    const existingUser = room.users.find((u) => u.id === this.currentUser!.id);
    if (!existingUser) {
      room.users.push(this.currentUser);
      room.lastActivity = Date.now();

      // Update room in Redis
      await redis.set(`collaboration:room:${roomId}`, JSON.stringify(room));
    }

    this.currentRoom = roomId;

    // Start presence heartbeat immediately
    this.startPresenceHeartbeat(roomId);

    // Give a moment for presence to be established
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Publish join event
    await this.publishEvent({
      type: CollaborationEventType.USER_JOINED,
      roomId,
      userId: this.currentUser.id,
      data: { user: this.currentUser, room },
      timestamp: Date.now(),
    });

    return room;
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.currentUser) return;

    // Get room from Redis
    const roomData = await redis.get(`collaboration:room:${roomId}`);
    if (!roomData || typeof roomData !== "string") return;

    const room: CollaborationRoom = JSON.parse(roomData) as CollaborationRoom;

    // Remove user from room
    room.users = room.users.filter((u) => u.id !== this.currentUser!.id);
    room.lastActivity = Date.now();

    // Update or delete room
    if (room.users.length === 0) {
      // Delete room and all associated data
      await redis.del(`collaboration:room:${roomId}`);
      await redis.srem("collaboration:rooms", roomId);
      await redis.del(`collaboration:livecoding:${roomId}`);
      await redis.del(`collaboration:messages:${roomId}`);
      await redis.del(`collaboration:typing:${roomId}`);
    } else {
      // Update room with remaining users
      await redis.set(`collaboration:room:${roomId}`, JSON.stringify(room));
    }

    // Stop presence heartbeat
    this.stopPresenceHeartbeat();

    // Publish leave event
    await this.publishEvent({
      type: CollaborationEventType.USER_LEFT,
      roomId,
      userId: this.currentUser.id,
      data: { user: this.currentUser },
      timestamp: Date.now(),
    });

    if (this.currentRoom === roomId) {
      this.currentRoom = null;
    }
  }

  async getRooms(): Promise<CollaborationRoom[]> {
    const roomIds = await redis.smembers("collaboration:rooms");
    const rooms: CollaborationRoom[] = [];

    for (const roomId of roomIds) {
      const roomData = await redis.get(`collaboration:room:${roomId}`);
      if (roomData && typeof roomData === "string") {
        rooms.push(JSON.parse(roomData) as CollaborationRoom);
      }
    }

    return rooms.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async roomExists(roomId: string): Promise<boolean> {
    const roomData = await redis.get(`collaboration:room:${roomId}`);
    return !!(roomData && typeof roomData === "string");
  }

  // Live Coding Mode
  async toggleLiveCodingMode(roomId: string): Promise<boolean> {
    if (!this.currentUser) {
      throw new Error("Must have a current user to toggle live coding mode");
    }

    const roomData = await redis.get(`collaboration:room:${roomId}`);
    if (!roomData || typeof roomData !== "string") {
      throw new Error("Room not found");
    }

    const room: CollaborationRoom = JSON.parse(roomData) as CollaborationRoom;

    // Only room owner can toggle live coding mode
    if (room.ownerId !== this.currentUser.id) {
      throw new Error("Only room owner can toggle live coding mode");
    }

    room.isLiveCodingMode = !room.isLiveCodingMode;
    room.lastActivity = Date.now();

    await redis.set(`collaboration:room:${roomId}`, JSON.stringify(room));

    // Initialize live coding session if enabling
    if (room.isLiveCodingMode) {
      const session: LiveCodingSession = {
        id: nanoid(),
        roomId,
        content: "",
        cursors: {},
        selections: {},
        version: 0,
        lastModifiedBy: this.currentUser.id,
        lastModifiedAt: Date.now(),
      };

      await redis.set(
        `collaboration:livecoding:${roomId}`,
        JSON.stringify(session),
      );
    } else {
      await redis.del(`collaboration:livecoding:${roomId}`);
    }

    // Publish mode switch event
    await this.publishEvent({
      type: CollaborationEventType.MODE_SWITCHED,
      roomId,
      userId: this.currentUser.id,
      data: { isLiveCodingMode: room.isLiveCodingMode },
      timestamp: Date.now(),
    });

    return room.isLiveCodingMode;
  }

  async updateLiveCode(
    roomId: string,
    content: string,
    cursorPosition?: CursorPosition,
  ): Promise<void> {
    if (!this.currentUser) return;

    const sessionData = await redis.get(`collaboration:livecoding:${roomId}`);
    if (!sessionData || typeof sessionData !== "string") return;

    const session: LiveCodingSession = JSON.parse(
      sessionData,
    ) as LiveCodingSession;
    session.content = content;
    session.version += 1;
    session.lastModifiedBy = this.currentUser.id;
    session.lastModifiedAt = Date.now();

    if (cursorPosition) {
      session.cursors[this.currentUser.id] = cursorPosition;
    }

    await redis.set(
      `collaboration:livecoding:${roomId}`,
      JSON.stringify(session),
    );

    // Publish live code update
    await this.publishEvent({
      type: CollaborationEventType.LIVE_CODE_UPDATED,
      roomId,
      userId: this.currentUser.id,
      data: {
        content,
        version: session.version,
        cursorPosition,
      },
      timestamp: Date.now(),
    });
  }

  async getLiveCodingSession(
    roomId: string,
  ): Promise<LiveCodingSession | null> {
    const sessionData = await redis.get(`collaboration:livecoding:${roomId}`);
    if (!sessionData || typeof sessionData !== "string") return null;

    return JSON.parse(sessionData) as LiveCodingSession;
  }

  // Typing Indicators
  async startTyping(roomId: string): Promise<void> {
    if (!this.currentUser) return;

    const indicator: TypingIndicator = {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      roomId,
      timestamp: Date.now(),
    };

    await redis.set(
      `collaboration:typing:${roomId}:${this.currentUser.id}`,
      JSON.stringify(indicator),
      { ex: Math.ceil(this.config.typingIndicatorTimeout / 1000) },
    );

    await this.publishEvent({
      type: CollaborationEventType.USER_TYPING,
      roomId,
      userId: this.currentUser.id,
      data: { userName: this.currentUser.name },
      timestamp: Date.now(),
    });

    // Auto-stop typing after timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      void this.stopTyping(roomId);
    }, this.config.typingIndicatorTimeout);
  }

  async stopTyping(roomId: string): Promise<void> {
    if (!this.currentUser) return;

    await redis.del(`collaboration:typing:${roomId}:${this.currentUser.id}`);

    await this.publishEvent({
      type: CollaborationEventType.USER_STOPPED_TYPING,
      roomId,
      userId: this.currentUser.id,
      data: {},
      timestamp: Date.now(),
    });

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  async getTypingUsers(roomId: string): Promise<TypingIndicator[]> {
    const pattern = `collaboration:typing:${roomId}:*`;
    const keys = await redis.keys(pattern);
    const indicators: TypingIndicator[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data && typeof data === "string") {
        indicators.push(JSON.parse(data) as TypingIndicator);
      }
    }

    return indicators;
  }

  // Messaging
  async sendMessage(
    roomId: string,
    content: string,
    type: "text" | "system" | "code" = "text",
  ): Promise<CollaborationMessage> {
    if (!this.currentUser) {
      throw new Error("Must have a current user to send message");
    }

    const message: CollaborationMessage = {
      id: nanoid(),
      roomId,
      userId: this.currentUser.id,
      content,
      timestamp: Date.now(),
      type,
    };

    const key = `collaboration:messages:${roomId}`;

    await redis.rpush(key, JSON.stringify(message));
    // Keep only last 100 messages (trim from left if over)
    await redis.ltrim(key, -100, -1);

    // If this key still has an old TTL from earlier versions, clear it so
    // messages aren't wiped automatically after timeout.
    const ttlSeconds = await redis.ttl(key);
    if (ttlSeconds !== null && ttlSeconds > 0) {
      await redis.persist(key);
    }

    // Publish message event
    await this.publishEvent({
      type: CollaborationEventType.MESSAGE_SENT,
      roomId,
      userId: this.currentUser.id,
      data: { message },
      timestamp: Date.now(),
    });

    return message;
  }

  async getMessages(roomId: string): Promise<CollaborationMessage[]> {
    const messagesData = await redis.lrange(
      `collaboration:messages:${roomId}`,
      0,
      -1,
    );
    return messagesData
      .map((data: string | CollaborationMessage) => {
        try {
          return typeof data === "string"
            ? (JSON.parse(data) as CollaborationMessage)
            : (data as CollaborationMessage);
        } catch (err) {
          console.error("Failed to parse collaboration message:", err, data);
          return null;
        }
      })
      .filter(
        (m: CollaborationMessage | null): m is CollaborationMessage => !!m,
      )
      .reverse();
  }

  /** Edit a message if permitted (author within 2 min OR moderator) */
  async editMessage(
    roomId: string,
    messageId: string,
    newContent: string,
  ): Promise<CollaborationMessage> {
    if (!this.currentUser) throw new Error("No current user");

    const msgsData = await redis.lrange(
      `collaboration:messages:${roomId}`,
      0,
      -1,
    );
    const msgs: CollaborationMessage[] = msgsData.map((m: string) =>
      JSON.parse(m),
    );
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error("Message not found");
    const msg = msgs[idx]!;

    const canEdit =
      (msg.userId === this.currentUser.id &&
        Date.now() - msg.timestamp <= 2 * 60 * 1000) ||
      this.currentUser.role === Role.MODERATOR;

    if (!canEdit) throw new Error("Permission denied");

    msg.content = newContent;
    msg.updatedAt = Date.now();

    // Update list element in-place to preserve ordering (newest first list)
    await redis.lset(
      `collaboration:messages:${roomId}`,
      idx,
      JSON.stringify(msg),
    );

    await this.publishEvent({
      type: CollaborationEventType.MESSAGE_EDITED,
      roomId,
      userId: this.currentUser.id,
      data: { message: msg },
      timestamp: Date.now(),
    });

    return msg;
  }

  /** Delete a message if permitted (author within 2 min OR moderator) */
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    if (!this.currentUser) throw new Error("No current user");

    const msgsData = await redis.lrange(
      `collaboration:messages:${roomId}`,
      0,
      -1,
    );
    const msgs: CollaborationMessage[] = msgsData.map((m: string) =>
      JSON.parse(m),
    );
    const idx = msgs.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error("Message not found");
    const msg = msgs[idx]!;

    const canDelete =
      (msg.userId === this.currentUser.id &&
        Date.now() - msg.timestamp <= 2 * 60 * 1000) ||
      this.currentUser.role === Role.MODERATOR;

    if (!canDelete) throw new Error("Permission denied");

    // Remove message at index
    // Redis has no direct lrem by index; rebuild list
    msgs.splice(idx, 1);
    await redis.del(`collaboration:messages:${roomId}`);
    if (msgs.length) {
      // Recreate list with newest-first ordering using RPUSH on reversed array
      await redis.rpush(
        `collaboration:messages:${roomId}`,
        ...msgs.map((m: CollaborationMessage) => JSON.stringify(m)),
      );
      await redis.ltrim(`collaboration:messages:${roomId}`, -100, -1);
    }

    await this.publishEvent({
      type: CollaborationEventType.MESSAGE_DELETED,
      roomId,
      userId: this.currentUser.id,
      data: { messageId },
      timestamp: Date.now(),
    });
  }

  // Event System
  private async publishEvent(event: CollaborationEvent): Promise<void> {
    // Store event temporarily for polling clients
    await redis.lpush(
      `collaboration:events:${event.roomId}`,
      JSON.stringify(event),
    );
    await redis.ltrim(`collaboration:events:${event.roomId}`, 0, 49); // Keep last 50 events
    await redis.expire(`collaboration:events:${event.roomId}`, 300); // 5 minute expiration

    // Notify local handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error("Error in collaboration event handler:", error);
        }
      });
    }
  }

  async pollEvents(roomId: string, since = 0): Promise<CollaborationEvent[]> {
    const eventsData = await redis.lrange(
      `collaboration:events:${roomId}`,
      0,
      -1,
    );
    return eventsData
      .map((data: string | CollaborationEvent) => {
        try {
          return typeof data === "string"
            ? (JSON.parse(data) as CollaborationEvent)
            : (data as CollaborationEvent);
        } catch (err) {
          console.error("Failed to parse collaboration event:", err, data);
          return null;
        }
      })
      .filter(
        (event: CollaborationEvent | null): event is CollaborationEvent =>
          !!event,
      )
      .filter((event: CollaborationEvent) => event.timestamp > since)
      .reverse(); // Get chronological order
  }

  on(
    eventType: CollaborationEventType,
    handler: (event: CollaborationEvent) => void,
  ): void {
    this.eventHandlers.get(eventType)?.add(handler);
  }

  off(
    eventType: CollaborationEventType,
    handler: (event: CollaborationEvent) => void,
  ): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  // Presence Management
  private startPresenceHeartbeat(roomId: string): void {
    this.stopPresenceHeartbeat(); // Clear any existing interval

    const sendHeartbeat = async () => {
      if (!this.currentUser) return;

      const presence: UserPresence = {
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        roomId,
        isOnline: true,
        lastSeen: Date.now(),
        isTyping: false,
        color: this.currentUser.color,
      };

      await redis.set(
        `collaboration:presence:${roomId}:${this.currentUser.id}`,
        JSON.stringify(presence),
        "EX",
        Math.ceil(this.config.presenceHeartbeatInterval / 1000) * 2, // 2x heartbeat interval
      );
    };

    // Send initial heartbeat immediately
    void sendHeartbeat();

    // Set up interval
    this.presenceInterval = setInterval(() => {
      void sendHeartbeat();
    }, this.config.presenceHeartbeatInterval);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  async getOnlineUsers(roomId: string): Promise<UserPresence[]> {
    const pattern = `collaboration:presence:${roomId}:*`;
    const keys = await redis.keys(pattern);
    const presence: UserPresence[] = [];

    // Get room data once for user info lookup
    const roomData = await redis.get(`collaboration:room:${roomId}`);
    let room: CollaborationRoom | null = null;
    if (roomData && typeof roomData === "string") {
      try {
        room = JSON.parse(roomData) as CollaborationRoom;
      } catch (error) {
        console.error("Failed to parse room data:", error);
      }
    }

    for (const key of keys) {
      const data = await redis.get(key);
      if (data && typeof data === "string") {
        try {
          const presenceData = JSON.parse(data) as UserPresence;

          // Ensure color and userName are included - fallback to room user data if missing
          if (room) {
            const user = room.users.find((u) => u.id === presenceData.userId);
            if (user) {
              if (!presenceData.color) {
                presenceData.color = user.color;
              }
              if (!presenceData.userName) {
                presenceData.userName = user.name;
              }
            }
          }

          presence.push(presenceData);
        } catch (error) {
          console.error("Failed to parse presence data:", error);
        }
      }
    }

    return presence;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.stopPresenceHeartbeat();

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (this.currentRoom) {
      await this.leaveRoom(this.currentRoom);
    }
  }
}

// Session-specific collaboration managers
const sessionManagers = new Map<string, CollaborationManager>();

export function getCollaborationManager(
  sessionId: string,
): CollaborationManager {
  let manager = sessionManagers.get(sessionId);
  if (!manager) {
    manager = new CollaborationManager();
    sessionManagers.set(sessionId, manager);

    // Clean up old sessions periodically (1 hour)
    setTimeout(
      () => {
        const oldManager = sessionManagers.get(sessionId);
        if (oldManager) {
          void oldManager.cleanup();
          sessionManagers.delete(sessionId);
        }
      },
      60 * 60 * 1000,
    );
  }
  return manager;
}

// Export manager and types
export * from "./types";
export { CollaborationManager };
