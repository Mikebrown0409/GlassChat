"use client";

import { useState } from "react";
import { DeepgramInspiredLayout } from "../../components/ui/DeepgramInspiredLayout";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isTyping?: boolean;
}

export default function TestDeepgramPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! Welcome to GlassChat. I'm your enterprise AI assistant, ready to help with voice AI, transcription, and any other questions you might have.",
      isUser: false,
    },
    {
      id: "2",
      content:
        "This looks much cleaner and more professional. I like the Deepgram-inspired design!",
      isUser: true,
    },
    {
      id: "3",
      content:
        "Thank you! This design focuses on enterprise aesthetics with clean typography, strategic use of purple accents, and minimal but effective animations. The interface prioritizes functionality and readability over flashy effects.",
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
          "That's a great question! This design emphasizes enterprise-grade aesthetics while maintaining excellent usability.",
          "I appreciate the feedback! The clean interface helps users focus on the conversation without distractions.",
          "The sidebar provides easy access to model selection, conversation history, and settings - just like professional AI platforms.",
          "The purple accent color adds a modern touch while maintaining the professional appearance that enterprises expect.",
          "This layout scales well from desktop to mobile, ensuring a consistent experience across all devices.",
          "The minimal animations and clean typography create a trustworthy, reliable feeling that's perfect for business use.",
        ];

        const aiMessage: Message = {
          id: (messageCounter + 1).toString(),
          content:
            responses[Math.floor(Math.random() * responses.length)] ??
            "How can I help you today?",
          isUser: false,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setMessageCounter((prev) => prev + 2);
      },
      1200 + Math.random() * 800,
    );
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <DeepgramInspiredLayout
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />

        {/* Design Info Badge */}
        <div className="fixed right-4 bottom-4 z-50">
          <div className="max-w-xs rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white">
            <div className="mb-1 font-medium text-purple-400">
              ✨ GlassChat Professional
            </div>
            <div className="text-xs text-slate-300">
              Glassmorphism • Dark Purple • Animated Highlights
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="fixed top-4 right-4 z-40 max-w-sm">
          <div className="rounded-lg border border-gray-200 bg-white/95 p-4 text-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
            <h3 className="mb-3 font-medium text-purple-600 dark:text-purple-400">
              Key Features:
            </h3>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <li>• Subtle glassmorphism effects</li>
              <li>• Dark purple accents and highlights</li>
              <li>• Animated input area highlights</li>
              <li>• Professional backdrop blur</li>
              <li>• GlassChat branding integration</li>
              <li>• Enterprise-ready aesthetics</li>
            </ul>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
