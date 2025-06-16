"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type CollabMode = "solo" | "collab";

interface CollabModeContextValue {
  mode: CollabMode;
  setMode: (m: CollabMode) => void;
  toggle: () => void;
}

const CollabModeContext = createContext<CollabModeContextValue | null>(null);

export function CollabModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<CollabMode>("solo");
  const toggle = () => setMode((m) => (m === "solo" ? "collab" : "solo"));
  return (
    <CollabModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </CollabModeContext.Provider>
  );
}

export function useCollabMode() {
  const ctx = useContext(CollabModeContext);
  if (!ctx) throw new Error("useCollabMode must be used within provider");
  return ctx;
}
