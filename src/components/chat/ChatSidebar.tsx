"use client";

import React, { useState } from "react";
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { GlassContainer } from "@/components/ui/GlassContainer";
import { useLiveChats, syncManager, SyncStatus } from "@/lib/sync";
import type { Chat } from "@/lib/db";
import { clsx } from "clsx";

interface ChatSidebarProps {
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  className?: string;
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ChatItem({ chat, isActive, onSelect, onDelete }: ChatItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const truncateTitle = (title: string, maxLength = 30) => {
    return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
  };

  return (
    <div className="relative">
      <GlassContainer
        className={clsx(
          "group cursor-pointer p-3 transition-all duration-200",
          isActive && "border-blue-400/30 bg-blue-500/20 dark:bg-blue-600/20",
        )}
        hover={!isActive}
        rounded="md"
      >
        <div onClick={onSelect} className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <ChatBubbleLeftIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3
                className={clsx(
                  "truncate text-sm font-medium",
                  isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-900 dark:text-gray-100",
                )}
                title={chat.title}
              >
                {truncateTitle(chat.title)}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className={clsx(
                  "rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700",
                  "opacity-0 transition-opacity group-hover:opacity-100",
                  showMenu && "opacity-100",
                )}
              >
                <EllipsisVerticalIcon className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(chat.updatedAt)}
              </span>

              {/* Sync status indicator */}
              {chat.syncStatus !== SyncStatus.SYNCED && (
                <div className="flex items-center gap-1">
                  <div
                    className={clsx(
                      "h-1.5 w-1.5 rounded-full",
                      chat.syncStatus === SyncStatus.PENDING && "bg-yellow-400",
                      chat.syncStatus === SyncStatus.SYNCING &&
                        "animate-pulse bg-blue-400",
                      chat.syncStatus === SyncStatus.ERROR && "bg-red-400",
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassContainer>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute top-full right-0 z-50 mt-1">
          <GlassContainer className="min-w-[120px] p-1" blur="lg">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="h-3 w-3" />
              Delete
            </button>
          </GlassContainer>
        </div>
      )}
    </div>
  );
}

export function ChatSidebar({
  currentChatId,
  onChatSelect,
  className,
}: ChatSidebarProps) {
  const chats = useLiveChats();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const newChat = await syncManager.createChat("New Chat");
      onChatSelect(newChat.id);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // TODO: Implement chat deletion in sync manager
      console.log("Delete chat:", chatId);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <div className={clsx("flex h-full w-80 flex-col", className)}>
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chats
          </h2>

          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-2",
              "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
              "dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800",
              "text-sm font-medium text-white",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "shadow-lg shadow-blue-500/25",
            )}
          >
            {isCreating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
            New Chat
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-4">
        {!chats ? (
          // Loading state
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <GlassContainer key={i} className="p-3">
                <div className="animate-pulse">
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700"></div>
                  <div className="h-3 w-1/2 rounded bg-gray-300 dark:bg-gray-700"></div>
                </div>
              </GlassContainer>
            ))}
          </div>
        ) : chats.length === 0 ? (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ChatBubbleLeftIcon className="mb-4 h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No chats yet
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Start a new conversation to get started
            </p>
          </div>
        ) : (
          // Chat list
          <div className="space-y-2">
            {chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChatId}
                onSelect={() => onChatSelect(chat.id)}
                onDelete={() => handleDeleteChat(chat.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;
