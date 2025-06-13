"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SidebarNavItem } from "~/components/ui/sidebar-nav-item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
      className="border-border-subtle fixed top-0 bottom-0 left-0 z-20 flex w-64 flex-col border-r bg-[#111] text-white"
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="border-border-subtle flex h-8 w-8 items-center justify-center rounded-lg border bg-[#1a1a1a] transition-all duration-200 hover:scale-105">
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
        <div className="px-4 py-3">
          <Button
            variant="default"
            size="md"
            onClick={() => void onNewChat()}
            className="w-full gap-2"
          >
            <Plus size={16} />
            New Conversation
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Conversation History */}
        <ScrollArea className="flex-1 px-3 pb-4">
          <AnimatePresence>
            {filteredHistory.map((chat) => (
              <div key={chat.id} className="relative">
                <SidebarNavItem
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: DYNAMIC_EASE }}
                  onClick={() => onSelectChat(chat.id)}
                  active={currentChatId === chat.id}
                  data-testid="chat-sidebar-item"
                >
                  <div className="flex items-center justify-between gap-3">
                    <MessageCircle
                      size={16}
                      className="text-muted/70 shrink-0"
                    />
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
                      <span className="truncate text-sm">{chat.title}</span>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onDeleteChat(chat.id);
                                }}
                                className="opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Trash2
                                  size={14}
                                  className="text-muted group-hover:text-red-600"
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </SidebarNavItem>
              </div>
            ))}
          </AnimatePresence>
        </ScrollArea>

        {/* Bottom Accordion */}
        <div className="mt-auto px-4 py-2">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="settings">
              <AccordionTrigger>Settings</AccordionTrigger>
              <AccordionContent>
                {/* Placeholder settings */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <ChevronLeft size={14} className="mr-2" /> Back
                </Button>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="trash">
              <AccordionTrigger>Trash</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted text-xs">No deleted chats.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
