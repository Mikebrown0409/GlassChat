import { ChatInterface } from "@/components/chat/ChatInterface";
import { GlassBackground } from "@/components/ui/GlassBackground";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function HomePage() {
  return (
    <GlassBackground animated pattern="gradient">
      {/* Header with theme controls */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <ChatInterface />
    </GlassBackground>
  );
}
