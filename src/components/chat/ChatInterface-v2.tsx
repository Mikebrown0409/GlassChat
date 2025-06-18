"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCollaboration } from "~/lib/collaboration-v2/hooks";
import { useChatGeneration } from "~/lib/collaboration-v2/useChatGeneration";
import { SimpleCollabPanel } from "../collaboration-v2/SimpleCollabPanel";

export function ChatInterfaceV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams?.get("room");
  const userFromUrl = searchParams?.get("user");

  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(false);
  const [personalChatId, setPersonalChatId] = useState<string>("");

  // Generate personalChatId on client-side only to avoid hydration mismatch
  useEffect(() => {
    setPersonalChatId(
      `personal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
  }, []);

  const collaboration = useCollaboration(
    roomIdFromUrl ?? null,
    userFromUrl ?? null,
  );

  // Determine which chat to use
  const effectiveChatId =
    collaboration.isInRoom && collaboration.currentRoom
      ? collaboration.currentRoom.chatId
      : personalChatId;

  // Initialize chat generation with the effective chat ID
  const {
    messages,
    sendMessage: sendToAI,
    isLoading: isGenerating,
    cancelGeneration,
  } = useChatGeneration(effectiveChatId);

  // Handle room joining from URL
  useEffect(() => {
    if (roomIdFromUrl && !collaboration.isInRoom) {
      // Show a simple prompt to join the room
      const userName = prompt(`Join room? Enter your name:`);
      if (userName?.trim()) {
        // In V2, room joining is handled by changing the URL with both room and participant
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("room", roomIdFromUrl);
        newUrl.searchParams.set("user", userName.trim());
        router.replace(newUrl.pathname + newUrl.search);
      }
    }
  }, [roomIdFromUrl, collaboration.isInRoom, collaboration, router]);

  // Clean up URL when leaving room
  useEffect(() => {
    if (!collaboration.isInRoom && roomIdFromUrl) {
      // Remove room parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("room");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [collaboration.isInRoom, roomIdFromUrl, router]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (content: string) => {
    if (collaboration.isInRoom) {
      // In a room - message goes to shared context
      console.log(
        `📤 Sending to shared room: ${collaboration.currentRoom?.name}`,
      );
    } else {
      // Personal chat
      console.log(`📤 Sending to personal chat`);
    }

    await sendToAI(content);
  };

  const handleTranslate = (text?: string) => {
    console.log("Translate:", text);
  };

  const handleExplain = (text?: string) => {
    console.log("Explain:", text);
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendToAI(suggestion);
  };

  const handleUpdateMessage = (id: string, newContent: string) => {
    console.log("Update message:", id, newContent);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <h2 className="font-semibold text-gray-800">
            {collaboration.isInRoom
              ? `🤝 ${collaboration.currentRoom?.name}`
              : "💬 Personal Chat"}
          </h2>
          <p className="text-sm text-gray-600">
            {collaboration.isInRoom
              ? `${collaboration.otherParticipants.length + 1} participants`
              : "Private conversation"}
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600">Chat ID: {effectiveChatId}</p>
          {collaboration.isInRoom && (
            <div className="mt-4">
              <h3 className="mb-2 font-medium text-gray-800">Participants:</h3>
              <div className="space-y-2">
                {collaboration.currentUser && (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                      style={{
                        backgroundColor: collaboration.currentUser.color,
                      }}
                    >
                      {collaboration.currentUser.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">
                      {collaboration.currentUser.name} (you)
                    </span>
                  </div>
                )}
                {collaboration.otherParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: participant.color }}
                    >
                      {participant.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm">{participant.name}</span>
                    <div
                      className="h-2 w-2 rounded-full bg-green-500"
                      title="Online"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {collaboration.isInRoom
                  ? `🤝 ${collaboration.currentRoom?.name ?? "Collaboration Room"}`
                  : "💬 Personal Chat"}
              </h1>
              <p className="text-sm text-gray-600">
                {collaboration.isInRoom
                  ? `${collaboration.otherParticipants.length + 1} participants`
                  : "Private conversation"}
              </p>
            </div>
            <button
              onClick={() => setIsCollabPanelOpen(!isCollabPanelOpen)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Collaborate
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {!messages || messages.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-800">
                  How can I help you today?
                </h3>
                <p className="mb-6 text-gray-600">
                  Start a conversation or{" "}
                  {collaboration.isInRoom
                    ? "collaborate with your team"
                    : "ask me anything"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "How to get started?",
                    "Explain the features",
                    "Help with collaboration",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${
                      message.role === "user"
                        ? "bg-blue-600"
                        : message.role === "system"
                          ? "bg-red-500"
                          : "bg-gray-600"
                    }`}
                  >
                    {message.role === "user"
                      ? "U"
                      : message.role === "system"
                        ? "!"
                        : "AI"}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm font-medium text-white">
                  AI
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={
                  collaboration.isInRoom
                    ? `Message ${collaboration.currentRoom?.name}...`
                    : "Message AI..."
                }
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      void handleSendMessage(target.value);
                      target.value = "";
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector(
                    'input[type="text"]',
                  ) as HTMLInputElement;
                  if (input?.value.trim()) {
                    void handleSendMessage(input.value);
                    input.value = "";
                  }
                }}
                disabled={isGenerating}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isGenerating ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Panel */}
      <SimpleCollabPanel
        isOpen={isCollabPanelOpen}
        onToggle={() => setIsCollabPanelOpen(!isCollabPanelOpen)}
      />
    </div>
  );
}
