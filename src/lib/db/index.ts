import Dexie, { type Table } from "dexie";
import {
  type SyncableEntity,
  type SyncOperationRecord,
  type SyncConflict,
  type SyncMetadata,
  SyncStatus,
} from "../sync/types";

export interface Chat extends SyncableEntity {
  id: string; // nanoid
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface Message extends SyncableEntity {
  id: string; // nanoid
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // timestamp
}

export interface User extends SyncableEntity {
  id: string; // unique identifier
  name: string;
  avatarUrl?: string;
}

export class GlassChatDatabase extends Dexie {
  chats!: Table<Chat>;
  messages!: Table<Message>;
  users!: Table<User>;
  syncOperations!: Table<SyncOperationRecord>;
  syncConflicts!: Table<SyncConflict>;
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super("glasschat-db");
    this.version(1).stores({
      chats: "id, createdAt, updatedAt, lastModified, syncStatus",
      messages: "id, chatId, createdAt, lastModified, syncStatus",
      users: "id, lastModified, syncStatus",
      syncOperations: "id, entityType, entityId, timestamp, applied",
      syncConflicts: "id, entityType, entityId, timestamp, resolved",
      syncMetadata: "deviceId, lastSyncTimestamp",
    });

    // Initialize sync metadata after database is ready
    if (typeof window !== "undefined") {
      void this.open().then(() => {
        void this.initializeSyncMetadata().catch(console.error);
      });
    }
  }

  private async initializeSyncMetadata() {
    const deviceId = this.generateDeviceId();
    const existingMetadata = await this.syncMetadata.get(deviceId);

    if (!existingMetadata) {
      await this.syncMetadata.put({
        deviceId,
        lastSyncTimestamp: 0,
        syncVersion: 1,
        pendingOperations: 0,
        conflictsCount: 0,
      });
    }
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem("glasschat-device-id");
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("glasschat-device-id", deviceId);
    }
    return deviceId;
  }

  async createSyncableEntity<T extends SyncableEntity>(
    table: Table<T>,
    entity: Omit<T, keyof SyncableEntity>,
  ): Promise<T> {
    const now = Date.now();
    const deviceId = this.generateDeviceId();

    const entityWithId = entity as Record<string, unknown>;
    const syncableEntity = {
      ...entity,
      localId:
        (entityWithId.id as string) ??
        `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastModified: now,
      syncStatus: SyncStatus.PENDING,
      version: 1,
      deviceId,
    } as T;

    await table.put(syncableEntity);
    return syncableEntity;
  }

  async updateSyncableEntity<T extends SyncableEntity>(
    table: Table<T>,
    id: string,
    updates: Partial<T>,
  ): Promise<void> {
    const existing = await table.get(id);
    if (!existing) throw new Error(`Entity with id ${id} not found`);

    const updatedEntity = {
      ...existing,
      ...updates,
      lastModified: Date.now(),
      syncStatus: SyncStatus.PENDING,
      version: existing.version + 1,
    };

    await table.put(updatedEntity);
  }
}

export const db = new GlassChatDatabase();
