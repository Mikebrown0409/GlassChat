import { ChatInterface } from "@/components/chat/ChatInterface";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Glassmorphism background overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 dark:from-white/5 dark:via-transparent dark:to-black/20" />

      {/* Main chat interface */}
      <div className="relative z-10">
        <ChatInterface />
      </div>
    </main>
  );
}
