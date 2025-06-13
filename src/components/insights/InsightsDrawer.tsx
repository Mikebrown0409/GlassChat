"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { useMemory } from "~/lib/memory/hooks";
import { Button } from "../ui/Button";

type Tab = "memory" | "collaboration";

const CollaborationPanel = dynamic(
  () =>
    import("../collaboration/CollaborationPanel").then(
      (m) => m.CollaborationPanel,
    ),
  { ssr: false, loading: () => null },
);
const MemoryPanel = dynamic(
  () => import("../memory/MemoryPanel").then((m) => m.MemoryPanel),
  { ssr: false, loading: () => null },
);

interface InsightsDrawerProps {
  open: boolean;
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
  currentChatId: string | null;
  memoryHook: ReturnType<typeof useMemory>;
}

const EASE = [0.22, 1, 0.36, 1];

export function InsightsDrawer({
  open,
  tab,
  setTab,
  onClose,
  currentChatId,
  memoryHook,
}: InsightsDrawerProps) {
  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="insights"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: EASE }}
          className="bg-surface-0/90 fixed inset-y-0 right-0 z-40 flex w-80 max-w-full flex-col shadow-xl backdrop-blur-lg"
        >
          <div className="border-border-subtle flex items-center justify-between border-b p-4">
            <div className="flex gap-2">
              {(["memory", "collaboration"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    tab === t
                      ? "bg-surface-1 text-primary"
                      : "text-muted hover:bg-surface-1/60",
                  )}
                >
                  {t === "memory" ? "Memory" : "Collab"}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close insights"
            >
              <X size={18} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "memory" ? (
              <MemoryPanel
                embedded
                currentChatId={currentChatId}
                isOpen={true}
                onToggle={onClose}
                memoryHook={memoryHook}
              />
            ) : (
              <CollaborationPanel
                embedded
                currentChatId={currentChatId}
                isOpen={true}
                onToggle={onClose}
              />
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
