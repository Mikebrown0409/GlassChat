"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AttachmentPicker } from "~/components/ui/AttachmentPicker";
import { Button } from "~/components/ui/Button";
import { SpeechToTextButton } from "~/components/ui/SpeechToTextButton";
import { type ChatComposerHandle } from "./ChatComposer";

interface ChatComposerV2Props {
  onSendMessage: (content: string) => Promise<void>;
  onSendToAI?: (content: string) => Promise<void>;
  isSendingMessage: boolean;
  isSendingToAI?: boolean;
  isCollaborationMode?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ChatComposerV2 = forwardRef<
  ChatComposerHandle,
  ChatComposerV2Props
>(
  (
    {
      onSendMessage,
      onSendToAI,
      isSendingMessage,
      isSendingToAI = false,
      isCollaborationMode = false,
      placeholder,
      disabled = false,
      className = "",
    },
    ref,
  ) => {
    const [input, setInput] = useState("");
    const [isAIMode, setIsAIMode] = useState(false);
    const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Expose methods through ref for compatibility
    useImperativeHandle(ref, () => ({
      setInput: (value: string) => setInput(value),
      getInput: () => input,
      focus: () => textareaRef.current?.focus(),
    }));

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [input]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSendingMessage || isSendingToAI) return;

        const content = input.trim();
        setInput("");

        try {
          if (isAIMode && onSendToAI && isCollaborationMode) {
            await onSendToAI(content);
          } else {
            await onSendMessage(content);
          }
        } catch (error) {
          console.error("Failed to send message:", error);
          // Restore input on error
          setInput(content);
        }
      },
      [
        input,
        isAIMode,
        onSendMessage,
        onSendToAI,
        isSendingMessage,
        isSendingToAI,
        isCollaborationMode,
      ],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          void handleSubmit(e);
        }
      },
      [handleSubmit],
    );

    const handleSpeechResult = useCallback((text: string) => {
      setInput((prev) => prev + (prev ? " " : "") + text);
    }, []);

    const handleFileSelect = useCallback((files: FileList) => {
      // For now, just log file selection - file upload would be implemented later
      console.log(
        "Files selected:",
        Array.from(files).map((f) => f.name),
      );
      setIsAttachmentPickerOpen(false);
    }, []);

    const getPlaceholder = () => {
      if (placeholder) return placeholder;

      if (isCollaborationMode) {
        return isAIMode
          ? "Ask the AI assistant (visible to all participants)..."
          : "Message the team...";
      }

      return "Type your message...";
    };

    const getButtonText = () => {
      if (isSendingMessage || isSendingToAI) return "...";
      if (isCollaborationMode && isAIMode) return "Ask AI";
      return "Send";
    };

    const getButtonStyle = () => {
      const baseStyle =
        "px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

      if (isCollaborationMode && isAIMode) {
        return `${baseStyle} bg-purple-600 hover:bg-purple-700 text-white`;
      }

      return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
    };

    return (
      <div className={`border-t border-gray-200 bg-white p-4 ${className}`}>
        {/* AI Mode Toggle for Collaboration */}
        {isCollaborationMode && onSendToAI && (
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={() => setIsAIMode(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !isAIMode
                  ? "border border-blue-200 bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              💬 Team Chat
            </button>
            <button
              onClick={() => setIsAIMode(true)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isAIMode
                  ? "border border-purple-200 bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🤖 AI Assistant
            </button>
            {isAIMode && (
              <span className="ml-2 text-xs text-purple-600">
                AI responses will be visible to all participants
              </span>
            )}
          </div>
        )}

        {/* Main Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          {/* Attachment Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAttachmentPickerOpen(!isAttachmentPickerOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={disabled}
            >
              📎
            </button>

            {isAttachmentPickerOpen && (
              <AttachmentPicker
                onFileSelect={handleFileSelect}
                onClose={() => setIsAttachmentPickerOpen(false)}
                position="top"
              />
            )}
          </div>

          {/* Text Input */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="max-h-32 min-h-[42px] w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 pr-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              disabled={disabled || isSendingMessage || isSendingToAI}
              rows={1}
            />

            {/* Speech to Text Button */}
            <div className="absolute top-2 right-2">
              <SpeechToTextButton
                onResult={handleSpeechResult}
                disabled={disabled || isSendingMessage || isSendingToAI}
                size="sm"
              />
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={
              !input.trim() || disabled || isSendingMessage || isSendingToAI
            }
            className={getButtonStyle()}
          >
            {isSendingMessage || isSendingToAI ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              getButtonText()
            )}
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          />
        </form>

        {/* Helpful hints */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {isCollaborationMode && (
            <span className="text-blue-600">
              {isAIMode ? "🤖 AI mode active" : "👥 Team chat active"}
            </span>
          )}
        </div>
      </div>
    );
  },
);

ChatComposerV2.displayName = "ChatComposerV2";

// Export handle type for compatibility
export type { ChatComposerHandle };
