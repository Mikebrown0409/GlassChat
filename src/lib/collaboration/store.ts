import { create } from "zustand";
import type { UserPresence } from "./types";

interface CollaborationState {
  currentRoomId: string | null;
  onlineUsers: UserPresence[];
  setCurrentRoomId: (id: string | null) => void;
  setOnlineUsers: (users: UserPresence[]) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  currentRoomId: null,
  onlineUsers: [],
  setCurrentRoomId: (id) => set({ currentRoomId: id }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
