"use client";

import { ChatContainer } from "../../components/ui/ChatContainer";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

export default function TestProfessionalPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <ChatContainer />
      </div>
    </ThemeProvider>
  );
} 