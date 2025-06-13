"use client";

import { clsx } from "clsx";
import { Menu, Sidebar as SidebarIcon } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TooltipProvider } from "~/components/ui/tooltip";
import { InsightsToggle } from "../ui/InsightsToggle";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onToggleMemory: () => void;
  className?: string;
}

export function ChatHeader({
  sidebarOpen,
  onOpenSidebar,
  onToggleMemory,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={clsx(
        "flex h-14 w-full items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 text-white",
        className,
      )}
    >
      {/* Left: Mobile menu + title */}
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 md:hidden" />
            <SidebarIcon className="hidden h-5 w-5 md:block" />
          </Button>
        )}
        <span className="text-sm font-medium md:text-base">GlassChat</span>
      </div>

      {/* Center placeholder */}
      <div className="hidden md:block"></div>

      {/* Right: actions */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
          <InsightsToggle onClick={onToggleMemory} />
          <ThemeSwitcher />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuItem onSelect={() => alert("Settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => alert("Logout")}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </header>
  );
}

export default ChatHeader;
