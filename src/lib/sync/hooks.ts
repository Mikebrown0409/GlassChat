import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { SyncStatus } from "./types";
import type { Chat, Message } from "../db";
import type { SyncStats } from "./types";

/**
 * Hook to get live chat list with sync status
 */
export function useLiveChats(): Chat[] | undefined {
  return useLiveQuery(() => db.chats.orderBy("updatedAt").reverse().toArray());
}

/**
 * Hook to get live messages for a specific chat
 */
export function useLiveMessages(chatId: string): Message[] | undefined {
  return useLiveQuery(() => {
    if (!chatId) return [];
    return db.messages.where("chatId").equals(chatId).sortBy("createdAt");
  }, [chatId]);
}

/**
 * Hook to get live sync statistics
 */
export function useLiveSyncStats(): SyncStats | undefined {
  return useLiveQuery(async () => {
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

    // const conflictsCount = await db.syncConflicts.where("resolved").equals(0).count();

    // Get device ID from localStorage
    const deviceId = localStorage.getItem("glasschat-device-id") ?? "unknown";
    const metadata = await db.syncMetadata.get(deviceId);

    return {
      totalOperations: 0, // Would need to track this separately
      pendingOperations: pendingCount,
      completedOperations: 0,
      failedOperations: 0,
      conflictsResolved: 0,
      lastSyncTime: metadata?.lastSyncTimestamp ?? 0,
      isOnline: navigator?.onLine ?? true,
      syncLatency: 0,
    };
  });
}

/**
 * Hook to get pending sync operations count
 */
export function usePendingSyncCount(): number | undefined {
  return useLiveQuery(async () => {
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
    return pendingChats + pendingMessages + pendingUsers;
  });
}

/**
 * Hook to get unresolved conflicts count
 */
export function useConflictsCount(): number | undefined {
  return useLiveQuery(() =>
    db.syncConflicts.where("resolved").equals(0).count(),
  );
}
