"use client";
import { useEffect } from "react";
import { db } from "~/lib/db";

interface Props {
  userId: string | null;
}

export function UserCacheIsolator({ userId }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lastUser = localStorage.getItem("glasschat-user-id");

    // If a different user signs in, wipe the local Dexie database
    if (userId && lastUser && lastUser !== userId) {
      void (async () => {
        try {
          await db.delete();
        } catch (err) {
          console.error("Failed to delete Dexie DB", err);
        } finally {
          // Re-open the database so the app keeps working
          await db.open().catch(console.error);
        }
      })();
    }

    if (userId) {
      localStorage.setItem("glasschat-user-id", userId);
    } else if (!userId) {
      // On logout remove flag so the next login triggers a wipe
      localStorage.removeItem("glasschat-user-id");
    }
  }, [userId]);

  return null;
}
