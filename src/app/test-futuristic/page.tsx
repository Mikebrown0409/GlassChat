"use client";

import { useState } from "react";
import { FuturisticChatLayout } from "../../components/ui/FuturisticChatLayout";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isTyping?: boolean;
}

export default function TestFuturisticPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! Welcome to GlintChat. I'm here to help you explore the future of AI conversations.",
      isUser: false,
    },
    {
      id: "2",
      content: "This looks amazing! The gradient effects are so smooth.",
      isUser: true,
    },
    {
      id: "3",
      content:
        "Thank you! This interface features dynamic gradients that respond to chat activity, futuristic animations, and a fully resizable sidebar. Feel free to test the various features!",
      isUser: false,
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [messageCounter, setMessageCounter] = useState(4);

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: messageCounter.toString(),
      content,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageCounter((prev) => prev + 1);

    // Simulate AI typing
    setIsTyping(true);

    setTimeout(
      () => {
        setIsTyping(false);

        // Add AI response
        const responses = [
          "That's a great question! The dynamic gradients shift based on chat activity - notice how they intensify when I'm typing?",
          "I love the smooth animations too! Each message slides in with a subtle scale effect, and the floating particles add a nice ambient touch.",
          "The sidebar is fully resizable - try dragging the orange-green resize handle! You can also collapse it completely.",
          "The theme toggle smoothly adapts all gradients between light and dark modes. Try clicking the sun/moon icon!",
          "The floating input bar has a nice glow effect when active, and the send button has that satisfying hover animation.",
          "This design is inspired by Scale AI, Fetch AI, and OpenAI - combining modern aesthetics with functional UX patterns.",
        ];

        const aiMessage: Message = {
          id: (messageCounter + 1).toString(),
          content:
            responses[Math.floor(Math.random() * responses.length)] ??
            "Hello! How can I help you today?",
          isUser: false,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setMessageCounter((prev) => prev + 2);
      },
      1500 + Math.random() * 1000,
    );
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <FuturisticChatLayout
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />

        {/* Performance indicator */}
        <div className="fixed right-4 bottom-4 z-50">
          <div className="rounded-lg bg-black/50 px-3 py-2 text-xs text-white/80 backdrop-blur-sm">
            <div>🚀 Futuristic Mode</div>
            <div>60 FPS Target</div>
          </div>
        </div>

        {/* Instructions overlay */}
        <div className="fixed top-4 right-4 z-40 max-w-xs">
          <div className="rounded-xl border border-white/20 bg-gradient-to-br from-teal-500/20 to-purple-500/20 p-4 text-sm text-white/80 backdrop-blur-md">
            <h3 className="mb-2 font-semibold text-orange-400">
              Test Features:
            </h3>
            <ul className="space-y-1 text-xs">
              <li>• Dynamic gradients respond to activity</li>
              <li>• Drag to resize sidebar</li>
              <li>• Toggle light/dark theme</li>
              <li>• Floating particles animation</li>
              <li>• Message slide-in effects</li>
              <li>• Hover glow on buttons</li>
            </ul>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
