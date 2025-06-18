// Simple Chat Generation Hook for V2 Collaboration
// Manages messages internally and provides a clean interface

import { useCallback, useRef, useState } from "react";
import { api } from "../../trpc/react";
import { AIModel } from "../ai/types";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

export function useChatGeneration(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Keep ref in sync with state
  messagesRef.current = messages;

  const generateResponse = api.ai.generateResponse.useMutation();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: content.trim(),
        createdAt: Date.now(),
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const systemPrompt = `You are a helpful, clear, and professional AI assistant. Provide helpful and accurate responses.`;

        const preparedMessages = [
          { role: "system" as const, content: systemPrompt },
          ...messagesRef.current.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user" as const, content: content.trim() },
        ];

        const response = await generateResponse.mutateAsync({
          model: AIModel.GEMINI_2_5_FLASH_LITE,
          messages: preparedMessages,
        });

        if (response.success && response.response?.content) {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: response.response.content,
            createdAt: Date.now(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "system",
            content:
              "Sorry, I encountered an error while processing your message. Please try again.",
            createdAt: Date.now(),
          };

          setMessages((prev) => [...prev, errorMessage]);
        }
      } catch (error) {
        // Only add error message if request wasn't aborted
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name !== "AbortError"
        ) {
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "system",
            content:
              "Sorry, I encountered an error while processing your message. Please try again.",
            createdAt: Date.now(),
          };

          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, generateResponse],
  );

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    cancelGeneration,
  };
}
