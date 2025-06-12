"use client";

import { clsx } from "clsx";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChatGeneration } from "~/lib/ai/useChatGeneration";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager, useLiveChats, useLiveMessages } from "~/lib/sync";

import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatSidebar } from "./ChatSidebar";
import { TextSelectionMenu } from "./TextSelectionMenu";

interface ChatInterfaceProps {
  className?: string;
}

// Lazy-load heavy panels to reduce initial JS bundle
const CollaborationPanel = dynamic(
  () =>
    import("~/components/collaboration/CollaborationPanel").then(
      (m) => m.CollaborationPanel,
    ),
  { ssr: false, loading: () => null },
);

const MemoryPanel = dynamic(
  () => import("~/components/memory/MemoryPanel").then((m) => m.MemoryPanel),
  { ssr: false, loading: () => null },
);

export function ChatInterface({ className: _className }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectionMenu, setSelectionMenu] = useState<{
    position: { top: number; left: number };
    text: string;
  } | null>(null);

  // Use ref to access current selectionMenu state in event handlers without causing re-renders
  const selectionMenuRef = useRef(selectionMenu);
  selectionMenuRef.current = selectionMenu;
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  // Debug currentChatId changes
  useEffect(() => {
    console.log("Debug - currentChatId changed to:", currentChatId);
  }, [currentChatId]);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const chats = useLiveChats();
  const rawMessages = useLiveMessages(currentChatId ?? "");
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  // generateResponse handled inside hook
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const {
    isTyping,
    selectedModel,
    setSelectedModel,
    generateResponseIsPending,
    handleSubmit: handleSubmitFromHook,
    handleStop,
  } = useChatGeneration(currentChatId, messages);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          const newChat = await syncManager.createChat("New Conversation");
          setCurrentChatId(newChat.id);
        } catch (error) {
          console.error("Failed to create initial chat:", error);
        }
      }
    };
    if (chats !== undefined) {
      void createInitialChat();
    }
  }, [chats]);

  useEffect(() => {
    // Don't auto-scroll if user has text selected to avoid interfering with selection
    if (typeof window !== "undefined") {
      const hasSelection = window.getSelection()?.toString().trim();
      if (!hasSelection) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // On server-side, just scroll normally
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle mouse events for dropdown and selection menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setModelDropdownOpen(false);
      }

      // Only close selection menu when clicking outside message areas
      if (selectionMenuRef.current) {
        const target = event.target as Element;
        const isInSelectionMenu = target.closest("[data-selection-menu]");
        const isInMessageContent =
          target.closest(".prose") ?? target.closest(".max-w-prose");
        const isInTextArea =
          target.closest("textarea") ?? target.closest("input");
        const isInButton = target.closest("button");

        // Don't clear if:
        // - Clicking on the selection menu
        // - Clicking in message content (might be selecting more text)
        // - Clicking in input areas
        // - Clicking on buttons (they handle their own clearing)
        if (
          !isInSelectionMenu &&
          !isInMessageContent &&
          !isInTextArea &&
          !isInButton
        ) {
          setSelectionMenu(null);
          // Only clear browser selection if clicking completely outside content
          // This allows users to click elsewhere and still use Cmd+C if they want
          setTimeout(() => {
            window.getSelection()?.removeAllRanges();
          }, 50);
        }
      }
    };

    // Use capture phase to handle clicks before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, []); // Remove selectionMenu dependency to prevent constant re-registration

  // Text selection handlers
  const handleCopySelection = () => {
    if (selectionMenu?.text) {
      // Ensure document is focused before attempting clipboard operation
      window.focus();
      document.body.focus();

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(selectionMenu.text)
          .then(() => {
            console.log("Selection copied successfully");
            // Don't clear the selection or menu - let user copy again or use Cmd+C
            // setSelectionMenu(null);
            // window.getSelection()?.removeAllRanges();
          })
          .catch((err) => {
            console.error("Clipboard API failed:", err);
            fallbackCopy(selectionMenu.text);
          });
      } else {
        // Use fallback method immediately
        fallbackCopy(selectionMenu.text);
      }
    }
  };

  // Reliable fallback copy method
  const fallbackCopy = (text: string) => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.setAttribute("readonly", "");
      textArea.setAttribute("aria-hidden", "true");

      document.body.appendChild(textArea);

      // Focus and select the text
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      // Execute copy command
      const result = document.execCommand("copy");

      // Clean up
      document.body.removeChild(textArea);

      if (result) {
        console.log("Fallback copy successful");
        // Don't clear the original selection - preserve it for user
        // setSelectionMenu(null);
        // window.getSelection()?.removeAllRanges();
      } else {
        console.error("Fallback copy failed");
        alert("Copy failed. Please try selecting and copying manually.");
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
      alert("Copy failed. Please try selecting and copying manually.");
    }
  };

  const handleExplainSelection = async (text?: string) => {
    const content = text ?? selectionMenu?.text;
    if (content && currentChatId) {
      const explanationPrompt = `Please explain this text: "${content}"`;
      setInputValue(explanationPrompt);
      setSelectionMenu(null); // clear any old menu state
    }
  };

  const handleTranslateSelection = async (text?: string) => {
    const content = text ?? selectionMenu?.text;
    if (content && currentChatId) {
      const translationPrompt = `Please translate this text to English: "${content}"`;
      setInputValue(translationPrompt);
      setSelectionMenu(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleNewChat = async () => {
    try {
      console.log("Debug - Creating new chat...");
      const newChat = await syncManager.createChat("New Conversation");
      console.log("Debug - Created new chat:", newChat);
      console.log("Debug - Setting currentChatId to:", newChat.id);
      setCurrentChatId(newChat.id);
      console.log("Debug - currentChatId state should now be:", newChat.id);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await syncManager.updateChat(chatId, { title: newTitle });
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Import db directly to delete chat and its messages
      const { db } = await import("~/lib/db");

      // Delete all messages in this chat first
      await db.messages.where("chatId").equals(chatId).delete();

      // Delete the chat itself
      await db.chats.delete(chatId);

      // If we deleted the current chat, select another one
      if (currentChatId === chatId) {
        const remainingChats = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .toArray();
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0]?.id);
        } else {
          setCurrentChatId(undefined);
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const models = [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Fastest and newest",
    },
    { id: "gpt-4", name: "GPT-4 Turbo", description: "Most capable model" },
    { id: "claude-3", name: "Claude 3", description: "Great for analysis" },
  ];

  // Handle keyboard shortcuts for selection menu
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (selectionMenuRef.current) {
        // Handle Cmd+C or Ctrl+C - allow native copy behavior
        if ((e.metaKey || e.ctrlKey) && e.key === "c") {
          return;
        }

        // Clear the menu and browser selection on escape key
        if (e.key === "Escape") {
          setSelectionMenu(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // Clear the menu on major scroll, but not the text selection
      if (selectionMenuRef.current) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setSelectionMenu(null);
        }, 1000);
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
      document.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmitFromHook(inputValue, () => setInputValue(""));
  };

  return (
    <div className="bg-surface-0 text-primary fixed inset-0 flex h-screen w-screen overflow-hidden font-sans">
      {/* Sidebar extracted into dedicated component */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentChatId={currentChatId}
        onSelectChat={handleChatSelect}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onNewChat={handleNewChat}
      />

      {/* Main Content with dynamic margin for sidebar */}
      <main
        data-chat-root
        className={clsx(
          "relative flex h-full min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out",
          sidebarOpen ? "ml-72 lg:ml-80" : "ml-0",
        )}
      >
        <AnimatePresence>
          {selectionMenu && (
            <TextSelectionMenu
              key="selection-menu"
              position={selectionMenu.position}
              onCopy={handleCopySelection}
              onExplain={handleExplainSelection}
              onTranslate={handleTranslateSelection}
            />
          )}
        </AnimatePresence>
        {/* Top Bar */}
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleCollaboration={() => setCollaborationOpen(!collaborationOpen)}
          onToggleMemory={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
        />

        {/* Messages Area */}
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          isPending={generateResponseIsPending}
          onTranslate={handleTranslateSelection}
          onExplain={handleExplainSelection}
          onSuggestionClick={handleSuggestionClick}
          messagesEndRef={messagesEndRef}
        />

        {/* Input Area (Composer) */}
        <ChatComposer
          inputValue={inputValue}
          setInputValue={setInputValue}
          isTyping={isTyping}
          onSubmit={handleFormSubmit}
          onStop={handleStop}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          modelDropdownOpen={modelDropdownOpen}
          setModelDropdownOpen={setModelDropdownOpen}
          models={models}
          textareaRef={textareaRef}
          dropdownRef={dropdownRef}
        />
      </main>

      {/* Lazy panels render only when open to avoid adding weight to initial paint */}
      {collaborationOpen && (
        <CollaborationPanel
          currentChatId={currentChatId ?? null}
          isOpen={collaborationOpen}
          onToggle={() => setCollaborationOpen(!collaborationOpen)}
        />
      )}

      {isMemoryPanelOpen && (
        <MemoryPanel
          currentChatId={currentChatId ?? null}
          isOpen={isMemoryPanelOpen}
          onToggle={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
          memoryHook={memory}
        />
      )}
    </div>
  );
}

export default ChatInterface;
