import { ChatInterface } from "@/components/chat/ChatInterface";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect("/landing");
  }

  return <ChatInterface />;
}
