"use client";

import React, { useState, useEffect } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { GlassContainer } from "@/components/ui/GlassContainer";
import { useLiveChats, syncManager } from "@/lib/sync";
import { clsx } from "clsx";

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const chats = useLiveChats();

  // Auto-select first chat if none selected
  useEffect(() => {
    if (!currentChatId && chats && chats.length > 0) {
      setCurrentChatId(chats[0]?.id);
    }
  }, [chats, currentChatId]);

  // Create initial chat if none exist
  useEffect(() => {
    const createInitialChat = async () => {
      if (chats && chats.length === 0) {
        try {
          const newChat = await syncManager.createChat("Welcome to GlassChat!");
          setCurrentChatId(newChat.id);

          // Add welcome message
          await syncManager.createMessage(
            newChat.id,
            "system",
            "Welcome to GlassChat! I'm your AI assistant. How can I help you today?",
          );
        } catch (error) {
          console.error("Failed to create initial chat:", error);
        }
      }
    };

    void createInitialChat();
  }, [chats]);

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleSendMessage = (message: string) => {
    // Message handling is done in ChatInput component
    console.log("Message sent:", message);
  };

  return (
    <div className={clsx("flex h-screen", className)}>
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <GlassContainer
          className="h-full rounded-none"
          blur="xl"
          opacity="medium"
          gradient
          animated
          shadow="xl"
          bordered={false}
        >
          <ChatSidebar
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
          />
        </GlassContainer>
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {currentChatId ? (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0">
              <GlassContainer
                className="rounded-none p-4"
                blur="lg"
                opacity="high"
                gradient
                animated
                shadow="lg"
                bordered={false}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {chats?.find((chat) => chat.id === currentChatId)
                        ?.title ?? "Chat"}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI-powered conversation
                    </p>
                  </div>

                  {/* Chat actions */}
                  <div className="flex items-center gap-2">
                    {/* AI Model indicator */}
                    <GlassContainer
                      className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                      blur="md"
                      opacity="medium"
                      rounded="full"
                      gradient
                      animated
                      scale
                      pulse
                    >
                      Gemini 2.0 Flash
                    </GlassContainer>

                    {/* Online status */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              </GlassContainer>
            </div>

            {/* Messages */}
            <MessageList chatId={currentChatId} className="flex-1" />

            {/* Input */}
            <div className="flex-shrink-0">
              <GlassContainer
                gradient
                animated
                blur="lg"
                opacity="medium"
                shadow="lg"
                className="rounded-none"
                bordered={false}
              >
                <ChatInput chatId={currentChatId} onSend={handleSendMessage} />
              </GlassContainer>
            </div>
          </>
        ) : (
          // Welcome screen when no chat is selected
          <div className="flex flex-1 items-center justify-center">
            <GlassContainer
              className="max-w-md p-12 text-center"
              gradient
              animated
              blur="xl"
              opacity="high"
              shadow="2xl"
              scale
              hover
            >
              <div className="animate-glass-float mb-6 text-6xl">💬</div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Welcome to GlassChat
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Experience AI conversations with a beautiful glassmorphism
                interface. Start by creating a new chat or selecting an existing
                one.
              </p>
              <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Real-time sync across devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Offline-first architecture</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span>Multiple AI models supported</span>
                </div>
              </div>
            </GlassContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatInterface;
