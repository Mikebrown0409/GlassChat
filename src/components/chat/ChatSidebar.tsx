"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { useLiveChats } from "~/lib/sync";

// Professional easing curve for all animations (keep in sync with ChatInterface)
const DYNAMIC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  currentChatId: string | undefined;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  onNewChat: () => Promise<void>;
}

export function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onNewChat,
}: ChatSidebarProps) {
  // Local sidebar-specific state
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationMenus, setConversationMenus] = useState<
    Record<string, boolean>
  >({});
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const chats = useLiveChats();
  const filteredHistory = (chats ?? []).filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleConversationMenu = (chatId: string) => {
    setConversationMenus((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  return (
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
            onClick={() => void onNewChat()}
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
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-surface-1 placeholder:text-surface-1/50 w-full bg-transparent px-4 py-2 text-sm focus:outline-none"
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
                  onClick={() => onSelectChat(chat.id)}
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
                            void onRenameChat(chat.id, renameValue.trim());
                          }
                          setRenamingChat(null);
                          setRenameValue("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim()) {
                            void onRenameChat(chat.id, renameValue.trim());
                            setRenamingChat(null);
                            setRenameValue("");
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
                        onClick={() => void onDeleteChat(chat.id)}
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
  );
}

export default ChatSidebar;
