"use client";

import { clsx } from "clsx";
import { Brain, Sidebar, Users } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onToggleCollaboration: () => void;
  onToggleMemory: () => void;
  className?: string;
}

export function ChatHeader({
  sidebarOpen,
  onOpenSidebar,
  onToggleCollaboration,
  onToggleMemory,
  className,
}: ChatHeaderProps) {
  return (
    <header
      data-fixed
      className={clsx(
        "bg-surface-0/80 flex h-20 shrink-0 items-center justify-between px-6 backdrop-blur-sm transition-colors duration-200",
        className,
      )}
    >
      <div className="flex items-center">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
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
        <Button variant="ghost" size="icon" onClick={onToggleCollaboration}>
          <Users size={20} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleMemory}>
          <Brain size={20} />
        </Button>
      </div>
    </header>
  );
}

export default ChatHeader;
