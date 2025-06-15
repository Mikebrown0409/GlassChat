"use client";

import ChatInterface from "../chat/ChatInterface";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  avatar?: string;
}

interface ChatContainerProps {
  className?: string;
}

// Avatar options for AI personalization
interface AIAvatar {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const AI_AVATARS: AIAvatar[] = [
  {
    id: "sage",
    name: "Sage",
    emoji: "🧙‍♂️",
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "nova",
    name: "Nova",
    emoji: "⭐",
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "iris",
    name: "Iris",
    emoji: "👁️",
    color: "from-blue-400 to-indigo-500",
  },
  { id: "echo", name: "Echo", emoji: "🌊", color: "from-cyan-400 to-blue-500" },
] as const;

const QUICK_REPLIES = [
  "Explain this concept",
  "Generate code example",
  "Help me brainstorm",
  "What's the best approach?",
];

// Temporary compatibility wrapper: forward to the modern ChatInterface component
export function ChatContainer({ className }: ChatContainerProps) {
  return <ChatInterface className={className} />;
}
