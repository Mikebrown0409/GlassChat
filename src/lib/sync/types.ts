export enum SyncOperation {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export enum SyncStatus {
  PENDING = "PENDING",
  SYNCING = "SYNCING",
  SYNCED = "SYNCED",
  CONFLICT = "CONFLICT",
  ERROR = "ERROR",
}

export enum ConflictResolution {
  LOCAL_WINS = "LOCAL_WINS",
  REMOTE_WINS = "REMOTE_WINS",
  MERGE = "MERGE",
  MANUAL = "MANUAL",
}

export interface SyncableEntity {
  id: string;
  localId: string;
  lastModified: number;
  syncStatus: SyncStatus;
  version: number;
  deviceId: string;
  userId?: string;
}

export interface SyncOperationRecord {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: Record<string, unknown>;
  timestamp: number;
  deviceId: string;
  userId?: string;
  version: number;
  applied: boolean;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  localVersion: number;
  remoteVersion: number;
  timestamp: number;
  resolution?: ConflictResolution;
  resolved: boolean;
}

export interface SyncMetadata {
  lastSyncTimestamp: number;
  deviceId: string;
  userId?: string;
  syncVersion: number;
  pendingOperations: number;
  conflictsCount: number;
}

export interface RedisMessage {
  type: "sync_operation" | "sync_request" | "conflict_resolution";
  deviceId: string;
  userId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SyncManagerConfig {
  redisUrl?: string;
  syncIntervalMs: number;
  maxRetries: number;
  batchSize: number;
  conflictResolutionStrategy: ConflictResolution;
  enableRealTimeSync: boolean;
}

export interface SyncStats {
  totalOperations: number;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
  conflictsResolved: number;
  lastSyncTime: number;
  isOnline: boolean;
  syncLatency: number;
}
