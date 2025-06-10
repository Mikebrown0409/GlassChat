import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import { db, type Chat, type Message, type User } from "../db";
import {
  type SyncableEntity,
  type SyncOperationRecord,
  type SyncConflict,
  type RedisMessage,
  type SyncManagerConfig,
  type SyncStats,
  SyncOperation,
  SyncStatus,
  ConflictResolution,
} from "./types";

class SyncManager {
  private redis: Redis | null = null;
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private syncInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private pendingSyncTimeout: NodeJS.Timeout | null = null;
  private config: SyncManagerConfig;
  private deviceId: string;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = {
      syncIntervalMs: 5000, // 5 seconds
      maxRetries: 3,
      batchSize: 50,
      conflictResolutionStrategy: ConflictResolution.LOCAL_WINS,
      enableRealTimeSync: true,
      ...config,
    };

    this.deviceId = this.getDeviceId();
    void this.initializeRedis();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private getDeviceId(): string {
    if (typeof localStorage === "undefined") {
      return `device-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    let deviceId = localStorage.getItem("glasschat-device-id");
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("glasschat-device-id", deviceId);
    }
    return deviceId;
  }

  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      console.info("No Redis URL provided, using local-only mode");
      return;
    }

    try {
      // For Upstash Redis, we need both URL and token
      if (this.config.redisUrl.startsWith("https://")) {
        const token = process.env.UPSTASH_REDIS_TOKEN;
        if (!token) {
          console.warn("Upstash Redis token not found, using local-only mode");
          return;
        }

        this.redis = new Redis({
          url: this.config.redisUrl,
          token,
        });
      } else {
        console.info("Local Redis URL detected, skipping in production build");
        return;
      }

      if (this.config.enableRealTimeSync) {
        void this.subscribeToRealTimeUpdates();
      }
    } catch (error) {
      console.warn("Redis connection failed, using local-only mode:", error);
      this.redis = null;
    }
  }

  private setupEventListeners() {
    if (typeof window === "undefined") return;

    // Online/offline detection
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.info("🌐 Connection restored, triggering sync");
      void this.performSync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.info("📱 Offline mode activated");
    });

    // Page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.isOnline) {
          void this.performSync();
        }
      });
    }
  }

  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.hasActiveTextSelection()) {
        void this.performSync();
      }
    }, this.config.syncIntervalMs);
  }

  private hasActiveTextSelection(): boolean {
    if (typeof window === "undefined") return false;

    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;

    if (hasSelection) {
      console.debug(
        "🔍 Text selection detected, pausing sync to preserve selection",
      );
    }

    return !!hasSelection;
  }

  private async subscribeToRealTimeUpdates() {
    if (!this.redis) return;

    // Clear existing poll interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    try {
      // In a real implementation, this would use Redis pubsub
      // For now, we'll implement polling for demo purposes
      const pollForUpdates = async () => {
        try {
          // Don't poll if user has text selected
          if (this.hasActiveTextSelection()) {
            return;
          }

          const messages = await this.redis?.lrange(
            "glasschat:messages",
            0,
            -1,
          );
          if (messages && messages.length > 0) {
            for (const messageStr of messages) {
              const message: RedisMessage = JSON.parse(
                messageStr,
              ) as RedisMessage;
              if (message.deviceId !== this.deviceId) {
                await this.handleRemoteMessage(message);
              }
            }
          }
        } catch (error) {
          console.warn("Error polling for updates:", error);
        }
      };

      // Poll every 10 seconds for real-time updates (reduced frequency)
      this.pollInterval = setInterval(() => void pollForUpdates(), 10000);
    } catch (error) {
      console.warn("Failed to set up real-time sync:", error);
    }
  }

  private async handleRemoteMessage(message: RedisMessage) {
    switch (message.type) {
      case "sync_operation":
        await this.applyRemoteOperation(
          message.data as unknown as SyncOperationRecord,
        );
        break;
      case "sync_request":
        await this.handleSyncRequest(message);
        break;
      case "conflict_resolution":
        await this.applyConflictResolution(message.data);
        break;
    }
  }

  private debouncedSync() {
    // Clear existing pending sync
    if (this.pendingSyncTimeout) {
      clearTimeout(this.pendingSyncTimeout);
    }

    // Schedule new sync
    this.pendingSyncTimeout = setTimeout(() => {
      void this.performSync();
    }, 1000);
  }

  async performSync(): Promise<SyncStats> {
    const startTime = Date.now();
    const stats: SyncStats = {
      totalOperations: 0,
      pendingOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      conflictsResolved: 0,
      lastSyncTime: startTime,
      isOnline: this.isOnline,
      syncLatency: 0,
    };

    try {
      console.info("🔄 Starting sync process...");

      // Step 1: Push pending local operations
      await this.pushPendingOperations();

      // Step 2: Pull remote operations
      await this.pullRemoteOperations();

      // Step 3: Resolve conflicts
      const conflicts = await this.resolveConflicts();
      stats.conflictsResolved = conflicts;

      // Step 4: Update metadata
      await this.updateSyncMetadata();

      stats.syncLatency = Date.now() - startTime;
      console.info(`✅ Sync completed in ${stats.syncLatency}ms`);
    } catch (error) {
      console.error("❌ Sync failed:", error);
      stats.failedOperations++;
    }

    return stats;
  }

  private async pushPendingOperations() {
    if (!this.redis) return;

    const pendingChats = await db.chats
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .toArray();

    const pendingMessages = await db.messages
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .toArray();

    const pendingUsers = await db.users
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .toArray();

    const allPending = [
      ...pendingChats.map((item) => ({ ...item, entityType: "chat" })),
      ...pendingMessages.map((item) => ({ ...item, entityType: "message" })),
      ...pendingUsers.map((item) => ({ ...item, entityType: "user" })),
    ];

    for (const entity of allPending) {
      try {
        await this.pushEntityToRedis(entity);

        // Update local status to SYNCING
        if (entity.entityType === "chat") {
          await db.chats.update(entity.id, { syncStatus: SyncStatus.SYNCING });
        } else if (entity.entityType === "message") {
          await db.messages.update(entity.id, {
            syncStatus: SyncStatus.SYNCING,
          });
        } else if (entity.entityType === "user") {
          await db.users.update(entity.id, { syncStatus: SyncStatus.SYNCING });
        }
      } catch (error) {
        console.error(
          `Failed to push ${entity.entityType} ${entity.id}:`,
          error,
        );
      }
    }
  }

  private async pushEntityToRedis(
    entity: SyncableEntity & { entityType: string },
  ) {
    if (!this.redis) return;

    const operation: SyncOperationRecord = {
      id: nanoid(),
      entityType: entity.entityType,
      entityId: entity.id,
      operation: SyncOperation.UPDATE, // Determine based on entity state
      data: entity as unknown as Record<string, unknown>,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      version: entity.version,
      applied: false,
    };

    const message: RedisMessage = {
      type: "sync_operation",
      deviceId: this.deviceId,
      timestamp: Date.now(),
      data: operation as unknown as Record<string, unknown>,
    };

    // Store in Redis list for other clients to poll
    await this.redis.lpush("glasschat:messages", JSON.stringify(message));

    // Store the entity data directly
    const key = `glasschat:${entity.entityType}:${entity.id}`;
    await this.redis.set(key, JSON.stringify(entity));
  }

  private async pullRemoteOperations() {
    if (!this.redis) return;

    try {
      // Get all chats, messages, and users from Redis
      const chatKeys = await this.redis.keys("glasschat:chat:*");
      const messageKeys = await this.redis.keys("glasschat:message:*");
      const userKeys = await this.redis.keys("glasschat:user:*");

      const allKeys = [...chatKeys, ...messageKeys, ...userKeys];

      for (const key of allKeys) {
        try {
          const dataStr = await this.redis.get(key);
          if (dataStr && typeof dataStr === "string") {
            const remoteEntity = JSON.parse(dataStr) as SyncableEntity & {
              entityType?: string;
            };
            await this.mergeRemoteEntity(remoteEntity);
          }
        } catch (error) {
          console.warn(`Failed to process remote entity ${key}:`, error);
        }
      }
    } catch (error) {
      console.error("Failed to pull remote operations:", error);
    }
  }

  private async mergeRemoteEntity(
    remoteEntity: SyncableEntity & { entityType?: string },
  ) {
    const entityType =
      remoteEntity.entityType ?? this.inferEntityType(remoteEntity);

    let localEntity: SyncableEntity | undefined;
    let table;

    switch (entityType) {
      case "chat":
        table = db.chats;
        localEntity = await db.chats.get(remoteEntity.id);
        break;
      case "message":
        table = db.messages;
        localEntity = await db.messages.get(remoteEntity.id);
        break;
      case "user":
        table = db.users;
        localEntity = await db.users.get(remoteEntity.id);
        break;
      default:
        console.warn(`Unknown entity type: ${entityType}`);
        return;
    }

    if (!localEntity) {
      // New entity from remote
      await table.put({
        ...remoteEntity,
        syncStatus: SyncStatus.SYNCED,
      } as Chat & Message & User);
    } else if (localEntity.version < remoteEntity.version) {
      // Remote is newer
      if (localEntity.syncStatus === SyncStatus.PENDING) {
        // Local has changes, create conflict
        await this.createConflict(localEntity, remoteEntity, entityType);
      } else {
        // Safe to update
        await table.put({
          ...remoteEntity,
          syncStatus: SyncStatus.SYNCED,
        } as Chat & Message & User);
      }
    } else if (localEntity.version > remoteEntity.version) {
      // Local is newer, push to remote
      await this.pushEntityToRedis({
        ...localEntity,
        entityType,
      });
    }
    // If versions are equal, entities are in sync
  }

  private inferEntityType(entity: SyncableEntity): string {
    const typedEntity = entity as unknown as Record<string, unknown>;
    if (typedEntity.chatId) return "message";
    if (typedEntity.title && typedEntity.createdAt) return "chat";
    if (typedEntity.name) return "user";
    return "unknown";
  }

  private async createConflict(
    localEntity: SyncableEntity,
    remoteEntity: SyncableEntity,
    entityType: string,
  ) {
    const conflict: SyncConflict = {
      id: nanoid(),
      entityType,
      entityId: localEntity.id,
      localData: localEntity as unknown as Record<string, unknown>,
      remoteData: remoteEntity as unknown as Record<string, unknown>,
      localVersion: localEntity.version,
      remoteVersion: remoteEntity.version,
      timestamp: Date.now(),
      resolved: false,
    };

    await db.syncConflicts.add(conflict);
    console.warn(`Conflict created for ${entityType} ${localEntity.id}`);
  }

  private async resolveConflicts(): Promise<number> {
    const unresolvedConflicts = await db.syncConflicts
      .where("resolved")
      .equals(0)
      .toArray();

    let resolvedCount = 0;

    for (const conflict of unresolvedConflicts) {
      try {
        await this.resolveConflict(conflict);
        resolvedCount++;
      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
      }
    }

    return resolvedCount;
  }

  private async resolveConflict(conflict: SyncConflict): Promise<void> {
    let resolvedData: Record<string, unknown>;

    switch (this.config.conflictResolutionStrategy) {
      case ConflictResolution.LOCAL_WINS:
        resolvedData = conflict.localData;
        break;
      case ConflictResolution.REMOTE_WINS:
        resolvedData = conflict.remoteData;
        break;
      case ConflictResolution.MERGE:
        resolvedData = this.mergeEntities(
          conflict.localData,
          conflict.remoteData,
        );
        break;
      default:
        // Manual resolution required
        return;
    }

    // Apply resolution
    const baseUpdate = {
      ...resolvedData,
      syncStatus: SyncStatus.SYNCED,
      version: Math.max(conflict.localVersion, conflict.remoteVersion) + 1,
    };

    switch (conflict.entityType) {
      case "chat":
        await db.chats.put(baseUpdate as Chat);
        break;
      case "message":
        await db.messages.put(baseUpdate as Message);
        break;
      case "user":
        await db.users.put(baseUpdate as User); // User type casting needed for conflict resolution
        break;
      default:
        throw new Error(`Unknown entity type: ${conflict.entityType}`);
    }

    // Mark conflict as resolved
    await db.syncConflicts.update(conflict.id, {
      resolved: true,
      resolution: this.config.conflictResolutionStrategy,
    });
  }

  private mergeEntities(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
  ): Record<string, unknown> {
    // Simple merge strategy: take newer timestamp for each field
    const merged = { ...local };

    Object.keys(remote).forEach((key) => {
      if (key === "lastModified" || key === "version") return;

      // If remote field is newer, use it
      const localModified = local.lastModified as number;
      const remoteModified = remote.lastModified as number;
      if (remoteModified > localModified) {
        merged[key] = remote[key];
      }
    });

    return merged;
  }

  private async updateSyncMetadata() {
    const metadata = await db.syncMetadata.get(this.deviceId);
    if (metadata) {
      await db.syncMetadata.update(this.deviceId, {
        lastSyncTimestamp: Date.now(),
        syncVersion: metadata.syncVersion + 1,
      });
    }
  }

  private async applyRemoteOperation(
    operation: SyncOperationRecord,
  ): Promise<void> {
    // Implementation for applying remote operations
    console.info(
      `Applying remote operation: ${operation.operation} on ${operation.entityType}`,
    );
  }

  private async handleSyncRequest(message: RedisMessage): Promise<void> {
    // Implementation for handling sync requests from other devices
    console.info("Handling sync request from:", message.deviceId);
  }

  private async applyConflictResolution(
    resolutionData: Record<string, unknown>,
  ): Promise<void> {
    // Implementation for applying conflict resolutions
    console.info("Applying conflict resolution:", resolutionData);
  }

  // Public API methods
  async createChat(title: string): Promise<Chat> {
    const chat = await db.createSyncableEntity(db.chats, {
      id: nanoid(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Omit<Chat, keyof SyncableEntity>);

    // Debounced sync
    if (this.isOnline) {
      this.debouncedSync();
    }

    return chat;
  }

  async createMessage(
    chatId: string,
    role: "user" | "assistant" | "system",
    content: string,
  ): Promise<Message> {
    const message = await db.createSyncableEntity(db.messages, {
      id: nanoid(),
      chatId,
      role,
      content,
      createdAt: Date.now(),
    } as Omit<Message, keyof SyncableEntity>);

    // Update the chat's updatedAt timestamp (without triggering another sync)
    const chat = await db.chats.get(chatId);
    if (chat) {
      await db.updateSyncableEntity(db.chats, chatId, {
        updatedAt: Date.now(),
      });
    }

    // Debounced sync
    if (this.isOnline) {
      this.debouncedSync();
    }

    return message;
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<void> {
    await db.updateSyncableEntity(db.chats, id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Debounced sync
    if (this.isOnline) {
      this.debouncedSync();
    }
  }

  // Helper methods for getting sync data (use hooks.ts for React components)
  async getSyncStats(): Promise<SyncStats> {
    const pendingChats = await db.chats
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .count();
    const pendingMessages = await db.messages
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .count();
    const pendingUsers = await db.users
      .where("syncStatus")
      .equals(SyncStatus.PENDING)
      .count();
    const pendingCount = pendingChats + pendingMessages + pendingUsers;

    const metadata = await db.syncMetadata.get(this.deviceId);

    return {
      totalOperations: 0, // Would need to track this
      pendingOperations: pendingCount,
      completedOperations: 0,
      failedOperations: 0,
      conflictsResolved: 0,
      lastSyncTime: metadata?.lastSyncTimestamp ?? 0,
      isOnline: this.isOnline,
      syncLatency: 0,
    };
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.pendingSyncTimeout) {
      clearTimeout(this.pendingSyncTimeout);
    }
  }
}

// Create singleton instance
export const syncManager = new SyncManager({
  redisUrl: process.env.NEXT_PUBLIC_UPSTASH_REDIS_URL,
  syncIntervalMs: 5000,
  enableRealTimeSync: true,
  conflictResolutionStrategy: ConflictResolution.LOCAL_WINS,
});

export { SyncManager };
