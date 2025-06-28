import { useCallback, useEffect, useRef, useState } from "react";
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
  const lastSummaryTimeRef = useRef<number>(0);

  const addMemoryMutation = api.memory.addMemory.useMutation();
  const summarizeHistoryMutation = api.memory.summarizeHistory.useMutation();

  useEffect(() => {
    if (!messages || !Array.isArray(messages) || !chatId) return;

    const messageCount = messages.length;
    const now = Date.now();
    const timeSinceLast = now - lastSummaryTimeRef.current;

    if (
      messageCount > 0 &&
      messageCount % 10 === 0 && // every 10 messages
      messageCount > lastSummarizedCount.current &&
      timeSinceLast > 5 * 60 * 1000 // or 5 minutes
    ) {
      lastSummarizedCount.current = messageCount;
      lastSummaryTimeRef.current = now;

      // Generate history string directly here to avoid dependency issues
      const currentHistoryString = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      console.log("[Memory] Triggering summary generation:", {
        chatId,
        messageCount,
        historyLength: currentHistoryString.length,
        isPending: summarizeHistoryMutation.isPending,
      });

      if (currentHistoryString && !summarizeHistoryMutation.isPending) {
        const params = { chatId, history: currentHistoryString };
        console.log("[Memory] Calling summarizeHistory with:", params);

        summarizeHistoryMutation.mutate(params, {
          onSuccess: (data) => {
            console.log("[Memory] Summary generation successful:", data);
            if (data.summary) {
              setSummary(data.summary);
              void memoryManagerClient.updateSummary(
                chatId,
                data.summary.summary,
                data.summary.keywords,
              );
            }
          },
          onError: (error) => {
            console.error("[Memory] Summary generation failed:", error);
          },
        });
      }
    }
  }, [messages, chatId, summarizeHistoryMutation]);

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
    isSummarizing: summarizeHistoryMutation.isPending,
  };
}
