import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { MemoryEntry, SmartSummary } from "~/types/memory";
import { memoryManagerClient } from "./memoryManager-client";

// A simplified message type for the hook's purposes
interface HookMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function useMemory(chatId: string | null, messages: HookMessage[]) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [summary, setSummary] = useState<SmartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastSummarizedCount = useRef(0);

  const addMemoryMutation = api.memory.addMemory.useMutation();
  const summarizeHistoryMutation = api.memory.summarizeHistory.useMutation();

  const historyString = useMemo(() => {
    return messages.map((m) => `${m.role}: ${m.content}`).join("\\n");
  }, [messages]);

  const generateSummary = useCallback(() => {
    if (!chatId || !historyString || summarizeHistoryMutation.isPending) return;

    summarizeHistoryMutation.mutate(
      { chatId, history: historyString },
      {
        onSuccess: (data) => {
          if (data.summary) {
            setSummary(data.summary);
            void memoryManagerClient.updateSummary(
              chatId,
              data.summary.summary,
              data.summary.keywords,
            );
          }
        },
      },
    );
  }, [chatId, historyString, summarizeHistoryMutation]);

  useEffect(() => {
    const messageCount = messages.length;
    if (
      messageCount > 0 &&
      messageCount % 2 === 0 &&
      messageCount > lastSummarizedCount.current
    ) {
      lastSummarizedCount.current = messageCount;
      void generateSummary();
    }
  }, [messages, generateSummary]);

  const loadInitialData = useCallback(async () => {
    if (!chatId) return;
    setIsLoading(true);
    const [memories, summary] = await Promise.all([
      memoryManagerClient.getMemories(chatId),
      memoryManagerClient.getSummary(chatId),
    ]);
    setMemories(memories);
    setSummary(summary ?? null);
    setIsLoading(false);
  }, [chatId]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const addMemory = useCallback(
    async (content: string, metadata: Record<string, unknown> = {}) => {
      if (!chatId) return;

      await memoryManagerClient.addMemory(chatId, content, metadata);
      // Refresh local memories after adding
      const newMemories = await memoryManagerClient.getMemories(chatId);
      setMemories(newMemories);

      addMemoryMutation.mutate({ chatId, content, metadata });
    },
    [chatId, addMemoryMutation],
  );

  return {
    memories,
    summary,
    isLoading,
    addMemory,
    generateSummary,
    isSummarizing: summarizeHistoryMutation.isPending,
  };
}
