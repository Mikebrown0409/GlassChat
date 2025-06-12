"use client";

import BeamLoader from "@/components/ui/BeamLoader";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, FileText, X } from "lucide-react";
import type { useMemory } from "~/lib/memory/hooks";

interface MemoryPanelProps {
  currentChatId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  memoryHook: ReturnType<typeof useMemory>;
}

export function MemoryPanel({
  isOpen,
  onToggle,
  memoryHook,
}: MemoryPanelProps) {
  const { summary, memories, generateSummary, isSummarizing } = memoryHook;

  const handleGenerateSummary = () => {
    generateSummary();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="border-border-subtle bg-surface-0/70 glass-effect fixed top-0 right-0 h-full w-96 border-l backdrop-blur-lg"
        >
          <div className="bg-surface-0/80 flex h-full flex-col backdrop-blur-lg">
            <header className="border-border-subtle bg-surface-1/70 flex h-16 shrink-0 items-center justify-between border-b px-4 shadow-md backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <Brain className="text-muted" />
                <h2 className="text-primary text-lg font-semibold">
                  Contextual Memory
                </h2>
              </div>
              <button
                onClick={onToggle}
                className="text-muted hover:bg-surface-1/60 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Smart Summary Section */}
                <div>
                  <h3 className="text-muted mb-3 text-xs font-semibold tracking-wider uppercase">
                    Smart Summary
                  </h3>
                  <div className="border-border-subtle bg-surface-1/60 rounded-lg border p-4">
                    {isSummarizing ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <BeamLoader size={16} />
                        <span>Generating...</span>
                      </div>
                    ) : summary ? (
                      <div>
                        <p className="text-primary/90 text-sm">
                          {summary.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {summary.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="bg-surface-2 text-primary/80 rounded-full px-2 py-0.5 text-[10px]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted/80 text-sm">
                        No summary available for this chat yet.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing || memories.length === 0}
                    className="bg-brand-primary hover:bg-brand-primary/80 mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSummarizing ? "Please wait..." : "Update Summary"}
                  </button>
                </div>

                {/* Memories Section */}
                <div>
                  <h3 className="text-muted mb-3 text-xs font-semibold tracking-wider uppercase">
                    Memories
                  </h3>
                  <div className="space-y-3">
                    {memories.length > 0 ? (
                      memories.map((entry) => (
                        <div
                          key={entry.id}
                          className="border-border-subtle bg-surface-1/60 rounded-lg border p-3"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="text-muted mt-1 h-4 w-4 shrink-0" />
                            <p className="text-primary/90 flex-1 text-sm">
                              {entry.content}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted/80 text-sm">
                        No memories stored for this chat yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
