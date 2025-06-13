"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChatGeneration } from "~/lib/ai/useChatGeneration";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager, useLiveChats, useLiveMessages } from "~/lib/sync";

import { useMediaQuery } from "~/hooks/useMediaQuery";
import { InsightsDrawer } from "../insights/InsightsDrawer";
import { ChatComposer, type ChatComposerHandle } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatSidebar } from "./ChatSidebar";

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className: _className }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsTab, setInsightsTab] = useState<"memory" | "collaboration">(
    "memory",
  );

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ref to call imperative methods on ChatComposer (setInput, focusInput)
  const composerRef = useRef<ChatComposerHandle>(null);

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
  // Remove the old selection menu handlers (copy handled by browser shortcuts)

  const handleExplainSelection = async (text?: string) => {
    const content = text ?? selectionMenu?.text;
    if (content && currentChatId) {
      const explanationPrompt = `Please explain this text: "${content}"`;
      composerRef.current?.setInput(explanationPrompt);
      composerRef.current?.focusInput();
      setSelectionMenu(null);
    }
  };

  const handleTranslateSelection = async (text?: string) => {
    const content = text ?? selectionMenu?.text;
    if (content && currentChatId) {
      const translationPrompt = `Please translate this text to English: "${content}"`;
      composerRef.current?.setInput(translationPrompt);
      composerRef.current?.focusInput();
      setSelectionMenu(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    composerRef.current?.setInput(suggestion);
    composerRef.current?.focusInput();
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

  const handleComposerSubmit = (text: string) => {
    void handleSubmitFromHook(text, () => composerRef.current?.setInput(""));
  };

  const handleToggleMemory = () => {
    setInsightsTab("memory");
    setInsightsOpen(true);
  };

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Ensure sidebar defaults to open on desktop and closed on mobile when viewport changes
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  return (
    <div className="bg-surface-0 text-primary fixed inset-0 flex h-screen w-screen overflow-hidden font-sans">
      {/* Sidebar (always rendered) */}
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
          sidebarOpen && isDesktop ? "ml-64" : "ml-0",
        )}
      >
        {/* Top Bar */}
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleMemory={handleToggleMemory}
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
          ref={composerRef}
          isTyping={isTyping}
          onSubmit={handleComposerSubmit}
          onStop={handleStop}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          modelDropdownOpen={modelDropdownOpen}
          setModelDropdownOpen={setModelDropdownOpen}
          models={models}
          dropdownRef={dropdownRef}
        />
      </main>

      {/* Insights Drawer */}
      <InsightsDrawer
        open={insightsOpen}
        tab={insightsTab}
        setTab={setInsightsTab}
        onClose={() => setInsightsOpen(false)}
        currentChatId={currentChatId ?? null}
        memoryHook={memory}
      />
    </div>
  );
}

export default ChatInterface;
