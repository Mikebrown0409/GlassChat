"use client";

import BeamLoader from "@/components/ui/BeamLoader";
import { AIModel } from "@/lib/ai/types";
import { syncManager } from "@/lib/sync";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

interface ChatInputProps {
  chatId: string;
  onSend?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  chatId,
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateResponse = api.ai.generateResponse.useMutation();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading || disabled) return;

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      // Create user message in local database
      await syncManager.createMessage(chatId, "user", userMessage);

      // Call onSend callback if provided
      onSend?.(userMessage);

      // Generate AI response
      const response = await generateResponse.mutateAsync({
        model: AIModel.GEMINI_2_0_FLASH, // Using Gemini 2.0 Flash as default
        messages: [
          // Add system prompt for better formatting
          {
            role: "system",
            content: `You are a helpful AI assistant. Please format your responses clearly and professionally:

📝 For stories and creative writing:
- Use short, readable paragraphs (2-3 sentences each)
- Add line breaks between paragraphs for better readability
- Use dialogue formatting when appropriate

💻 For code examples:
- Always include comments explaining what the code does
- Provide context about when/how to use the code  
- Include usage examples when helpful
- Suggest relevant file names (e.g., "Save as app.py")

📋 For explanations and lists:
- Use proper headings and subheadings
- Break content into digestible sections
- Use bullet points or numbered lists when appropriate
- Include practical examples

🎯 General formatting:
- Keep paragraphs concise and scannable
- Use markdown formatting (headers, code blocks, emphasis)
- Provide actionable, useful responses
- Include relevant context and next steps

Your goal is to provide responses that are immediately useful and easy to copy/use.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      // Create AI response message
      if (response.success && response.response?.content) {
        await syncManager.createMessage(
          chatId,
          "assistant",
          response.response.content,
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Create error message
      await syncManager.createMessage(
        chatId,
        "system",
        "Sorry, I encountered an error while processing your message. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <div className={clsx("p-4", className)}>
      <div className="p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Message input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className={clsx(
                "w-full resize-none border-0 bg-transparent",
                "text-gray-900 dark:text-gray-100",
                "placeholder:text-gray-500 dark:placeholder:text-gray-400",
                "focus:ring-0 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "max-h-32 min-h-[24px] px-3 py-2",
                "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
                "scrollbar-track-transparent",
              )}
              style={{ lineHeight: "1.5" }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!message.trim() || isLoading || disabled}
            className={clsx(
              "flex items-center justify-center",
              "h-10 w-10 rounded-lg",
              "bg-accent-primary hover:bg-accent-primary/90 active:bg-accent-primary/80",
              "text-white",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "disabled:hover:bg-accent-primary",
              "shadow-accent-primary/25 shadow-lg",
              "border-accent-primary/30 border",
            )}
          >
            {isLoading ? (
              <BeamLoader size={16} />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Character count and hints */}
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {message.length > 0 && (
              <span
                className={clsx(message.length > 1000 && "text-orange-500")}
              >
                {message.length}/1000
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
