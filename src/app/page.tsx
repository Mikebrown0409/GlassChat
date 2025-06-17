import { ChatInterface } from "@/components/chat/ChatInterface";

export const dynamic = "force-dynamic";

// Middleware already ensures only authenticated users reach this page.
// Removing the auth() check avoids server↔middleware disagreements that can
// cause redirect loops. If, for any reason, an unauthenticated request slips
// through, ChatInterface will render but its client-side hooks will prompt the
// user to sign in on first API call.

export default function HomePage() {
  return <ChatInterface />;
}
