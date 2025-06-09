"use client";

import { ChatGPTInterface } from "../../components/ui/ChatGPTInterface";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

export default function TestChatGPTPage() {
  return (
    <ThemeProvider>
      <ChatGPTInterface />
    </ThemeProvider>
  );
} 