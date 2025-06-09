"use client";

import { useState } from "react";
import { ModernGlassChatLayout } from "../../components/ui/ModernGlassChatLayout";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

export default function TestModernPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
    },
    {
      id: "2", 
      content: "I'd like to discuss our product roadmap and get some strategic insights.",
      isUser: true,
    },
    {
      id: "3",
      content: "I'd be happy to help with product strategy! Let's start by understanding your current goals and challenges. What's your primary focus for the next quarter?",
      isUser: false,
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (message: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI typing
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: `Thank you for your message: "${message}". This is a simulated response to demonstrate the interface.`,
        isUser: false,
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <ModernGlassChatLayout
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
      </div>
    </ThemeProvider>
  );
} 