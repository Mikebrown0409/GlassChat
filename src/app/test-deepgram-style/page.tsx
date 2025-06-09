"use client";

import { DeepgramStyleChatUI } from "../../components/ui/DeepgramStyleChatUI";
import { ThemeProvider } from "../../components/ui/ThemeProvider";

export default function TestDeepgramStylePage() {
  return (
    <ThemeProvider>
      <DeepgramStyleChatUI />
    </ThemeProvider>
  );
} 