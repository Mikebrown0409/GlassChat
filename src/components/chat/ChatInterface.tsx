"use client";

import BeamLoader from "@/components/ui/BeamLoader";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Brain,
  ChevronLeft,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  Sidebar,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/Button";
import { AIModel } from "~/lib/ai/types";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager, useLiveChats, useLiveMessages } from "~/lib/sync";
import { api } from "~/trpc/react";

import { ThemeSwitcher } from "../ui/ThemeSwitcher";
import { MessageDisplay } from "./MessageDisplay";
import { TextSelectionMenu } from "./TextSelectionMenu";

interface ChatInterfaceProps {
  className?: string;
}

// Professional easing curve for all animations
const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

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
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Gemini 2.0 Flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [conversationMenus, setConversationMenus] = useState<
    Record<string, boolean>
  >({});
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const chats = useLiveChats();
  const rawMessages = useLiveMessages(currentChatId ?? "");
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  // tRPC mutation for AI responses
  const generateResponse = api.ai.generateResponse.useMutation();

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

  const handleExplainSelection = async () => {
    if (selectionMenu?.text && currentChatId) {
      const explanationPrompt = `Please explain this text: "${selectionMenu.text}"`;
      setInputValue(explanationPrompt);
      // Only clear menu, keep the text selection highlighted
      setSelectionMenu(null);
      // Don't clear the text selection - let user keep it highlighted
      // window.getSelection()?.removeAllRanges();
    }
  };

  const handleTranslateSelection = async () => {
    if (selectionMenu?.text && currentChatId) {
      const translationPrompt = `Please translate this text to English: "${selectionMenu.text}"`;
      setInputValue(translationPrompt);
      // Only clear menu, keep the text selection highlighted
      setSelectionMenu(null);
      // Don't clear the text selection - let user keep it highlighted
      // window.getSelection()?.removeAllRanges();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentChatId || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    try {
      await syncManager.createMessage(currentChatId, "user", userMessage);
      await memory.addMemory(userMessage, { role: "user" });

      const map: Record<string, AIModel> = {
        "Gemini 2.0 Flash": AIModel.GEMINI_2_0_FLASH,
        "GPT-4 Turbo": AIModel.GPT_4_TURBO,
        "Claude 3": AIModel.CLAUDE_3_SONNET,
      };
      const aiModel = map[selectedModel] ?? AIModel.GEMINI_2_0_FLASH;

      const systemPrompt = `You are a helpful AI assistant with a perfect memory of the conversation so far.
Your task is to continue the chat. Use the provided message history to answer questions and maintain context.
Be helpful and engaging.`;

      // The history should NOT include the latest user message
      const history = messagesRef.current.slice(0, -1);

      const preparedMessages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user" as const, content: userMessage },
      ];

      const response = await generateResponse.mutateAsync({
        model: aiModel,
        messages: preparedMessages,
      });

      if (response.success && response.response?.content) {
        await syncManager.createMessage(
          currentChatId,
          "assistant",
          response.response.content,
        );
        await memory.addMemory(response.response.content, {
          role: "assistant",
        });
      } else {
        await syncManager.createMessage(
          currentChatId,
          "system",
          "Sorry, I encountered an error while processing your message. Please try again.",
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Create error message
      if (currentChatId) {
        await syncManager.createMessage(
          currentChatId,
          "system",
          "Sorry, I encountered an error while processing your message. Please try again.",
        );
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Handler to stop response generation
  const handleStop = async () => {
    if (!currentChatId) return;
    // Notify user that response was stopped
    await syncManager.createMessage(
      currentChatId,
      "system",
      "Response generation stopped by user.",
    );
    setIsTyping(false);
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
    setConversationMenus({}); // Close all menus
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await syncManager.updateChat(chatId, { title: newTitle });
      setRenamingChat(null);
      setRenameValue("");
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

      setConversationMenus({});
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const toggleConversationMenu = (chatId: string) => {
    setConversationMenus((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  const filteredHistory = (chats ?? []).filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  return (
    <div className="bg-surface-0 text-primary fixed inset-0 flex h-screen w-screen overflow-hidden font-sans">
      {/* Sidebar as sliding overlay */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ ease: DYNAMIC_EASE, duration: 0.3 }}
        className="border-border-subtle bg-surface-0/70 glass-effect fixed top-0 bottom-0 left-0 z-20 flex w-72 flex-col border-r backdrop-blur-lg lg:w-80"
      >
        {/* Header */}
        <div className="border-border-subtle flex h-20 shrink-0 items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="border-border-subtle bg-surface-1 flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted transition-colors duration-200"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-primary text-base font-semibold transition-colors duration-200">
                GlassChat
              </h1>
              <p className="text-muted text-sm transition-colors duration-200">
                Conversational Intelligence
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            title="Collapse Sidebar"
            className="button-hover"
          >
            <ChevronLeft size={18} />
          </Button>
        </div>

        {/* New Chat Button, Search, and History Wrapper */}
        <div className="flex flex-1 flex-col overflow-y-hidden">
          {/* New Chat and Search */}
          <div className="p-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => void handleNewChat()}
              className="w-full"
            >
              <Plus size={16} />
              New Conversation
            </Button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-border-subtle bg-surface-1 text-primary placeholder:text-muted focus:border-brand-primary/50 focus:bg-surface-1 focus:ring-brand-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-colors focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <AnimatePresence>
              {filteredHistory.map((chat) => (
                <div key={chat.id} className="relative">
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: DYNAMIC_EASE }}
                    onClick={() => handleChatSelect(chat.id)}
                    className={clsx(
                      "group w-full cursor-pointer rounded-md p-2 text-left transition-colors duration-200",
                      currentChatId === chat.id
                        ? "bg-surface-1 text-primary"
                        : "text-muted hover:bg-surface-1/60 hover:text-primary",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {renamingChat === chat.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => {
                            if (renameValue.trim()) {
                              void handleRenameChat(
                                chat.id,
                                renameValue.trim(),
                              );
                            } else {
                              setRenamingChat(null);
                              setRenameValue("");
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renameValue.trim()) {
                              void handleRenameChat(
                                chat.id,
                                renameValue.trim(),
                              );
                            } else if (e.key === "Escape") {
                              setRenamingChat(null);
                              setRenameValue("");
                            }
                          }}
                          className="border-brand-primary/50 bg-surface-0 text-primary flex-1 rounded border px-2 py-1 text-sm focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate text-sm font-normal">
                          {chat.title}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <AnimatePresence>
                          {searchQuery === "" && renamingChat !== chat.id && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-muted/70 text-xs"
                            >
                              {new Date(chat.updatedAt).toLocaleDateString()}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {renamingChat !== chat.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleConversationMenu(chat.id);
                            }}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            data-conversation-menu
                          >
                            <MoreHorizontal size={14} className="text-muted" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Conversation Menu */}
                  <AnimatePresence>
                    {conversationMenus[chat.id] && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: DYNAMIC_EASE }}
                        className="border-border-subtle bg-surface-1/90 absolute top-full right-0 z-50 mt-1 w-40 rounded-lg border shadow-xl backdrop-blur-xl"
                        data-conversation-menu
                      >
                        <button
                          onClick={() => {
                            setRenamingChat(chat.id);
                            setRenameValue(chat.title);
                            setConversationMenus({});
                          }}
                          className="text-muted hover:bg-surface-0 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg"
                        >
                          <Edit3 size={14} />
                          Rename
                        </button>
                        <button
                          onClick={() => void handleDeleteChat(chat.id)}
                          className="text-brand-secondary hover:bg-brand-secondary/10 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors last:rounded-b-lg"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto p-4">
          <button className="text-muted hover:bg-surface-1/60 hover:text-primary flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors">
            <div className="bg-surface-1 h-8 w-8 rounded-full"></div>
            <div className="flex-1 truncate">Chat User</div>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </motion.aside>

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
              position={selectionMenu.position}
              onCopy={handleCopySelection}
              onExplain={handleExplainSelection}
              onTranslate={handleTranslateSelection}
            />
          )}
        </AnimatePresence>
        {/* Top Bar */}
        <header
          data-fixed
          className="bg-surface-0/80 flex h-20 shrink-0 items-center justify-between px-6 backdrop-blur-sm transition-colors duration-200"
        >
          <div className="flex items-center">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="mr-4 -ml-2"
                title="Expand Sidebar"
              >
                <Sidebar size={20} />
              </Button>
            )}

            <div className="flex items-center gap-3">
              <div className="bg-brand-utility h-2 w-2 animate-pulse rounded-full"></div>
              <span className="text-primary text-sm">Voice AI Assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollaborationOpen(!collaborationOpen)}
            >
              <Users size={20} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
            >
              <Brain size={20} />
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="chat-viewport glass-scrollbar">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: DYNAMIC_EASE }}
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
                className="border-border-subtle bg-surface-1 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-muted transition-colors duration-200"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: DYNAMIC_EASE }}
                className="text-primary mb-1 text-xl font-semibold transition-colors duration-200"
              >
                How can I help you today?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: DYNAMIC_EASE }}
                className="text-muted mx-auto mb-8 max-w-sm transition-colors duration-200"
              >
                Ask me anything about voice AI, speech-to-text, or audio
                intelligence implementation.
              </motion.p>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  "How to get started with real-time transcription?",
                  "Explain your different voice AI models.",
                  "How to reduce audio processing costs?",
                ].map((suggestion, i) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.2 + i * 0.1, ease: DYNAMIC_EASE },
                    }}
                    whileHover={{ y: -2, transition: { ease: DYNAMIC_EASE } }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="border-border-subtle bg-surface-1/60 text-muted hover:border-border-subtle hover:bg-surface-1 rounded-full border px-4 py-2 text-sm transition-colors"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-8 p-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
                    className={clsx(
                      "group flex gap-4",
                      message.role === "user" ? "flex-row-reverse" : "",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200",
                        message.role === "user"
                          ? "bg-surface-2 text-secondary"
                          : message.role === "system"
                            ? "bg-accent-100 text-accent-500"
                            : "bg-surface-1 text-secondary",
                      )}
                    >
                      {message.role === "user"
                        ? "You"
                        : message.role === "system"
                          ? "!"
                          : "AI"}
                    </div>
                    <div
                      className={clsx(
                        "flex max-w-[85%] flex-col gap-1",
                        message.role === "user" ? "items-end" : "items-start",
                      )}
                    >
                      <MessageDisplay
                        key={message.id}
                        message={message}
                        _isTyping={index === messages.length - 1 && isTyping}
                        onTranslate={handleTranslateSelection}
                        onExplain={handleExplainSelection}
                        _isNewMessage={index === messages.length - 1}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator Area (fixed height to prevent CLS) */}
              <div style={{ minHeight: 40 }}>
                {(isTyping || generateResponse.isPending) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ ease: DYNAMIC_EASE }}
                    className="flex items-center gap-4"
                  >
                    <div className="bg-surface-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <BeamLoader size={18} />
                    </div>
                    <div className="border-border-subtle bg-surface-0 rounded-lg border p-4">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="bg-accent-500 h-1.5 w-1.5 rounded-full"
                            animate={{ y: [0, -2, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <footer
          data-fixed
          className="border-border-subtle bg-surface-0/80 glass-effect border-t p-4 backdrop-blur-sm transition-all duration-200"
        >
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit(e);
                    }
                  }}
                  placeholder={
                    isTyping ? "AI is responding..." : "Ask anything..."
                  }
                  className="border-border-subtle bg-surface-1 text-primary placeholder:text-muted focus:border-brand-primary/50 focus:ring-brand-primary/20 max-h-48 min-h-[50px] w-full resize-none rounded-lg border p-3 pr-28 text-sm transition-all duration-200 outline-none focus:ring-2 disabled:opacity-60"
                  rows={1}
                  disabled={isTyping}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <div ref={dropdownRef}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    >
                      <span>{selectedModel}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Button>
                    {modelDropdownOpen && (
                      <div className="border-border-subtle bg-surface-1 absolute right-0 bottom-full z-50 mb-2 w-48 rounded-lg border shadow-2xl">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setModelDropdownOpen(false);
                            }}
                            className={`hover:bg-surface-0 w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedModel === model.name
                                ? "text-brand-primary"
                                : "text-primary"
                            }`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isTyping ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStop}
                      aria-label="Stop response generation"
                      className="bg-surface-0 text-primary ring-border-subtle flex h-8 w-8 animate-pulse items-center justify-center rounded-full ring-1"
                      style={{ animationDuration: "2.5s" }}
                    >
                      <Square size={14} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      size="icon"
                      disabled={!inputValue.trim()}
                      className="h-8 w-8"
                    >
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted">
                  Press <strong>Shift+Enter</strong> for a new line
                </span>
                <span
                  className={clsx(
                    "font-medium",
                    inputValue.length > 2000
                      ? "text-brand-secondary"
                      : "text-muted/70",
                  )}
                >
                  {inputValue.length} / 2000
                </span>
              </div>
            </form>
          </div>
        </footer>
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
