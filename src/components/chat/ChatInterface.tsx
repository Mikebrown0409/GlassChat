"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useChatGeneration } from "~/lib/ai/useChatGeneration";
import { useCollaboration } from "~/lib/collaboration/hooks";
import { db } from "~/lib/db";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager, useLiveChats, useLiveMessages } from "~/lib/sync";

import { clsx } from "clsx";
import { useCollabMode } from "~/context/CollabModeContext";
import { useMediaQuery } from "~/hooks/useMediaQuery";
import { useCollaborationStore } from "~/lib/collaboration/store";
import { InsightsDrawer } from "../insights/InsightsDrawer";
import { ChatComposer, type ChatComposerHandle } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatSidebar } from "./ChatSidebar";

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className: _className }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams?.get("room");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{
    position: { top: number; left: number };
    text: string;
  } | null>(null);

  // Use ref to access current selectionMenu state in event handlers without causing re-renders
  const selectionMenuRef = useRef(selectionMenu);
  selectionMenuRef.current = selectionMenu;
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsTab, setInsightsTab] = useState<"memory" | "collaboration">(
    "memory",
  );

  const chats = useLiveChats();

  // Collaboration integration - MOVED UP to fix initialization order
  const currentRoomIdFromStore = useCollaborationStore((s) => s.currentRoomId);
  const collaboration = useCollaboration(currentRoomIdFromStore);
  const setCurrentRoomIdGlobal = useCollaborationStore(
    (s) => s.setCurrentRoomId,
  );

  // **SHARED LLM CHAT**: Use room's chatId when in collaboration room, otherwise use regular chatId
  const effectiveChatId = useMemo(() => {
    // Only switch to shared room chat if we have both room ID and room data
    if (
      currentRoomIdFromStore &&
      collaboration.room?.chatId &&
      collaboration.room.id === currentRoomIdFromStore
    ) {
      console.log(
        "🤝 Using shared room chatId for LLM:",
        collaboration.room.chatId,
      );
      return collaboration.room.chatId;
    }

    console.log("👤 Using personal chatId:", currentChatId);
    return currentChatId;
  }, [
    currentRoomIdFromStore,
    collaboration.room?.chatId,
    collaboration.room?.id,
    currentChatId,
  ]);

  // Add debug logging for when effectiveChatId changes (reduced frequency)
  useEffect(() => {
    if (effectiveChatId) {
      console.log("📱 effectiveChatId changed to:", effectiveChatId);
    }
  }, [effectiveChatId]);

  // Debug logging for collaboration state changes (reduced frequency)
  useEffect(() => {
    if (currentRoomIdFromStore && collaboration.room?.id) {
      console.log("🏠 Collaboration room active:", {
        roomId: collaboration.room.id,
        chatId: collaboration.room.chatId,
        users: collaboration.room.users?.length,
      });
    }
  }, [currentRoomIdFromStore, collaboration.room?.id]);

  // Load messages from the effective chat ID (shared room chat or personal chat)
  const rawMessages = useLiveMessages(effectiveChatId ?? "");
  const messages = rawMessages ?? [];

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(effectiveChatId ?? null, messages);

  // Track URL room join attempts to prevent infinite loops
  const [urlRoomJoined, setUrlRoomJoined] = useState<string | null>(null);
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState(false);

  // IMPROVED: Auto-join room from URL parameter with better error handling
  useEffect(() => {
    // Prevent multiple simultaneous join attempts
    if (
      !roomIdFromUrl ||
      !collaboration.user ||
      urlRoomJoined === roomIdFromUrl ||
      isJoiningFromUrl ||
      currentRoomIdFromStore === roomIdFromUrl // Already in the room
    ) {
      return;
    }

    const joinRoomFromUrl = async () => {
      setIsJoiningFromUrl(true);
      try {
        setUrlRoomJoined(roomIdFromUrl); // Mark as attempted

        console.log("🔗 Joining room from URL:", roomIdFromUrl);

        // Set room in global state first to prevent race conditions
        setCurrentRoomIdGlobal(roomIdFromUrl);

        // Join the room and get the room data
        const joinResult = await collaboration.joinRoom(roomIdFromUrl);

        if (joinResult.success && joinResult.room) {
          const roomChatId = joinResult.room.chatId;

          console.log("✅ Room joined successfully:", {
            roomId: joinResult.room.id,
            roomName: joinResult.room.name,
            roomChatId,
            roomUsers: joinResult.room.users.length,
          });

          // **CRITICAL FIX**: Switch chat context to the room's chatId
          try {
            const existingChats = await syncManager.getChats();
            const chatExists = existingChats.some(
              (chat) => chat.id === roomChatId,
            );

            if (!chatExists) {
              console.log("📝 Creating new shared chat for room:", roomChatId);
              await syncManager.createChatWithId(
                roomChatId,
                joinResult.room.name || "Shared Room",
              );
            }

            // Switch to the room's chat - this will be used by effectiveChatId
            setCurrentChatId(roomChatId);
            console.log("🔄 Switched to shared room chat:", roomChatId);
          } catch (error) {
            console.error("❌ Failed to handle room chat creation:", error);
            // Fallback: still switch to the chatId even if creation failed
            setCurrentChatId(roomChatId);
          }

          // Open collaboration panel to show the room
          setInsightsOpen(true);
          setInsightsTab("collaboration");

          console.log("🎉 Successfully joined and configured room from URL");
        } else {
          console.error(
            "❌ Room join failed:",
            joinResult.error || "Unknown error",
          );
          setUrlRoomJoined(null); // Reset for retry
          setCurrentRoomIdGlobal(null); // Clear room state
        }
      } catch (error) {
        console.error("❌ Failed to join room from URL:", error);
        setUrlRoomJoined(null); // Reset so it can be retried
        setCurrentRoomIdGlobal(null); // Clear room state
      } finally {
        setIsJoiningFromUrl(false);
      }
    };

    // Small delay to ensure user is fully initialized
    const timeoutId = setTimeout(joinRoomFromUrl, 300);
    return () => clearTimeout(timeoutId);
  }, [
    roomIdFromUrl,
    collaboration.user,
    collaboration.joinRoom,
    setCurrentRoomIdGlobal,
    urlRoomJoined,
    isJoiningFromUrl,
    currentRoomIdFromStore,
  ]);

  // IMPROVED: Auto-create collaboration user if authenticated but no collab user exists
  const [hasAttemptedUserCreation, setHasAttemptedUserCreation] =
    useState(false);

  useEffect(() => {
    if (
      !collaboration.user &&
      !collaboration.isCreating &&
      session?.user &&
      !hasAttemptedUserCreation
    ) {
      const userName =
        session.user.name ?? session.user.email ?? `User-${Date.now()}`;

      setHasAttemptedUserCreation(true);
      void collaboration.createUser(userName).catch((error) => {
        console.error("Failed to auto-create collaboration user:", error);
        setHasAttemptedUserCreation(false); // Allow retry on error
      });
    }
  }, [
    collaboration.user,
    collaboration.isCreating,
    collaboration.createUser,
    session,
    hasAttemptedUserCreation,
  ]);

  // generateResponse handled inside hook
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(
    "gemini-2.5-flash-lite-preview-06-17",
  );
  const {
    isTyping,
    generateResponseIsPending,
    handleSubmit: handleSubmitFromHook,
    handleStop,
  } = useChatGeneration(effectiveChatId, messages, selectedModelId);

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
      const newChat = await syncManager.createChat("New Conversation");
      setCurrentChatId(newChat.id);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    startTransition(() => {
      setCurrentChatId(chatId);
    });
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
      id: "gemini-2.5-flash-lite-preview-06-17",
      name: "Gemini 2.5 Flash-Lite",
      description: "Fastest and newest",
      enabled: true,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Cost-efficient GPT-4o variant",
      enabled: true,
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      description: "Coming soon",
      enabled: false,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      description: "Coming soon",
      enabled: false,
    },
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
    // **ALWAYS SEND TO LLM**: Main chat is always for LLM interaction
    // When in collaboration room, this creates shared LLM conversation via effectiveChatId
    // The collaboration panel has separate user-to-user chat
    void handleSubmitFromHook(text, () => composerRef.current?.setInput(""));
  };

  const handleToggleMemory = () => {
    setInsightsTab("memory");
    setInsightsOpen(true);
  };

  const { toggle, mode } = useCollabMode();
  const currentRoomIdStore = useCollaborationStore((s) => s.currentRoomId);

  const handleToggleCollab = () => {
    toggle();
    if (mode === "solo") {
      // entering collab: just open drawer; user can create/join via UI
      setInsightsTab("collaboration");
      setInsightsOpen(true);
    } else {
      // leaving collab
      setInsightsOpen(false);
    }
  };

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Ensure sidebar defaults to open on desktop and closed on mobile when viewport changes
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  const handleUpdateMessage = async (id: string, newContent: string) => {
    try {
      await db.updateSyncableEntity(db.messages, id, {
        content: newContent,
      });
      // Debounce sync
      await syncManager.performSync();
    } catch (err) {
      console.error("Failed to update message", err);
    }
  };

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        id: string;
        content: string;
      };
      if (detail?.id && detail.content) {
        void handleUpdateMessage(detail.id, detail.content);
      }
    };
    window.addEventListener("diagram-update", listener);
    return () => window.removeEventListener("diagram-update", listener);
  }, []);

  return (
    <div className="bg-surface-0 text-primary fixed inset-0 flex h-screen w-screen overflow-hidden font-sans">
      {/* Sidebar (always rendered) */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentChatId={effectiveChatId}
        onSelectChat={handleChatSelect}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onNewChat={handleNewChat}
      />

      {/* Main Content with dynamic margin for sidebar */}
      <main
        data-chat-root
        className={clsx(
          "relative flex h-full min-w-0 flex-1 flex-col transition-all duration-300",
          insightsOpen && isDesktop && "mr-80",
        )}
      >
        {/* Top Bar */}
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onToggleMemory={handleToggleMemory}
          onToggleCollab={handleToggleCollab}
        />

        {/* Messages Area */}
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          isPending={generateResponseIsPending}
          onTranslate={handleTranslateSelection}
          onExplain={handleExplainSelection}
          onSuggestionClick={handleSuggestionClick}
          onUpdateMessage={handleUpdateMessage}
          messagesEndRef={messagesEndRef}
        />

        {/* Input Area (Composer) */}
        <ChatComposer
          ref={composerRef}
          isTyping={isTyping}
          onSubmit={handleComposerSubmit}
          onStop={handleStop}
          selectedModel={selectedModelId}
          setSelectedModel={setSelectedModelId}
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
        currentChatId={effectiveChatId ?? null}
        memoryHook={memory}
      />
    </div>
  );
}

export default ChatInterface;
