"use client";

import { motion } from "framer-motion";
import {
  ChevronLeft,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TooltipProvider } from "~/components/ui/tooltip";
import { useCollaborationStore } from "~/lib/collaboration/store";
import type { Chat } from "~/lib/db";
import { useLiveChats } from "~/lib/sync";
import { cn } from "~/utils/cn";

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
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const chats = useLiveChats();
  // Collaboration store — determine if we are in a room and who is online
  const { currentRoomId: collabRoomId, onlineUsers } = useCollaborationStore(
    (s) => ({ currentRoomId: s.currentRoomId, onlineUsers: s.onlineUsers }),
  );

  // Memoize filtered chats to avoid re-computation on each render
  const filteredHistory = useMemo<Chat[]>(() => {
    if (!chats) return [];
    const q = searchQuery.toLowerCase();
    return q
      ? chats.filter((chat) => chat.title.toLowerCase().includes(q))
      : chats;
  }, [chats, searchQuery]);

  // Separate memoized row component to prevent re-renders of unchanged rows
  const ChatRow = useCallback(
    ({ chat }: { chat: Chat }) => {
      const isRenaming = renamingChat === chat.id;
      return (
        <div key={chat.id} className="group w-full">
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (renameValue.trim()) {
                  void onRenameChat(chat.id, renameValue.trim());
                }
                setRenamingChat(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setRenamingChat(null);
                }
              }}
              className="focus:ring-brand-primary h-8 w-full rounded-md border-none bg-zinc-800/70 px-2 text-sm text-zinc-100 focus:ring-2"
            />
          ) : (
            <div className="group grid w-full grid-cols-[1fr_auto] items-center overflow-hidden rounded-md px-3 py-1 hover:bg-zinc-800">
              <button
                type="button"
                className={cn(
                  "min-w-0 cursor-pointer truncate text-left text-sm text-zinc-300 focus:outline-none",
                  currentChatId === chat.id && "text-white",
                )}
                onClick={() => onSelectChat(chat.id)}
                title={chat.title}
              >
                <span className="truncate">{chat.title}</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Chat options"
                    className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:ring-0 focus-visible:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={14} className="text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem
                    onSelect={() => {
                      setRenamingChat(chat.id);
                      setRenameValue(chat.title);
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void onDeleteChat(chat.id)}
                    className="text-red-500 focus:text-red-500"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      );
    },
    [
      currentChatId,
      onDeleteChat,
      onRenameChat,
      onSelectChat,
      renameValue,
      renamingChat,
    ],
  );

  const MemoChatRow = memo(ChatRow);

  return (
    <motion.aside
      initial={{ x: "-100%" }}
      animate={{ x: sidebarOpen ? 0 : "-100%" }}
      transition={{ ease: DYNAMIC_EASE, duration: 0.3 }}
      className={cn(
        "relative flex h-full w-64 flex-shrink-0 flex-col overflow-hidden rounded-br-2xl border-r border-zinc-800/40 bg-zinc-900 text-zinc-200 shadow-inner",
      )}
    >
      <div className="flex items-center gap-2 p-4 text-lg font-semibold">
        <MessageCircle size={20} />
        GlassChat
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto hover:bg-zinc-800 hover:text-white"
        >
          <ChevronLeft size={16} />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="space-y-2 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onNewChat()}
          className="w-full justify-start gap-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Plus size={16} />
          New Chat
        </Button>

        {/* Search */}
        <Input
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="focus:ring-brand-primary h-8 rounded-md border-none bg-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:ring-2"
        />
      </div>

      {/* Scrollable conversation list */}
      <TooltipProvider delayDuration={200}>
        <ScrollArea className="mt-4 flex-1 px-2">
          <div className="px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Chats
          </div>
          <div className="mt-2 space-y-2">
            {filteredHistory.map((chat) => (
              <MemoChatRow key={chat.id} chat={chat} />
            ))}
          </div>

          {/* Online collaborators */}
          {collabRoomId && onlineUsers.length > 0 && (
            <div className="mt-6">
              <div className="px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Team
              </div>
              <div className="mt-2 flex flex-wrap gap-2 px-2">
                {onlineUsers.map((u) => (
                  <Avatar
                    key={u.userId}
                    className="border-surface-0 h-7 w-7 border-2 bg-zinc-700"
                    title={u.userId}
                  >
                    <AvatarFallback className="text-[10px]">
                      {u.userId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </TooltipProvider>

      {/* Bottom user/settings section */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start">
            <DropdownMenuItem
              onSelect={() => alert("Settings")}
              className="flex items-center gap-2"
            >
              <SettingsIcon size={16} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => alert("Logout")}
              className="flex items-center gap-2 text-red-500 focus:text-red-500"
            >
              <LogOut size={16} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <MoreHorizontal size={16} className="text-zinc-400" />
      </div>
    </motion.aside>
  );
}

export default ChatSidebar;
