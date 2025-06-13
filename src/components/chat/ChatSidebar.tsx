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
import { useState } from "react";
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
  const filteredHistory = (chats ?? []).filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.aside
      initial={{ x: "-100%" }}
      animate={{ x: sidebarOpen ? 0 : "-100%" }}
      transition={{ ease: DYNAMIC_EASE, duration: 0.3 }}
      className="relative flex h-full w-64 flex-shrink-0 flex-col rounded-br-2xl border-r border-zinc-800/40 bg-zinc-900 text-zinc-200 shadow-inner"
    >
      <div className="flex items-center gap-2 p-4 text-lg font-semibold">
        <MessageCircle size={20} />
        GlassChat
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto"
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
      <ScrollArea className="mt-4 flex-1 px-2">
        <div className="px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Chats
        </div>
        <div className="mt-2 space-y-2">
          {filteredHistory.map((chat) => (
            <Button
              key={chat.id}
              variant="ghost"
              className={cn(
                "w-full justify-start truncate text-zinc-300 hover:bg-zinc-800 hover:text-white",
                currentChatId === chat.id &&
                  "bg-zinc-800 text-white hover:bg-zinc-800",
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              {chat.title}
            </Button>
          ))}
        </div>
      </ScrollArea>

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
