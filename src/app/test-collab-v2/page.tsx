"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCollaboration } from "~/lib/collaboration-v2/hooks";

export default function TestCollabV2() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room") ?? "test-room";
  const [participantName, setParticipantName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  const {
    room,
    messages,
    sendMessage,
    sendMessageToAI,
    isSendingMessage,
    isSendingToAI,
    error,
    isWsConnected,
    refreshData,
  } = useCollaboration(
    hasJoined ? roomId : null,
    hasJoined ? participantName : null,
  );

  const handleJoin = (name: string) => {
    setParticipantName(name);
    setHasJoined(true);
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSendToAI = async (content: string) => {
    try {
      await sendMessageToAI(content);
    } catch (error) {
      console.error("Failed to send message to AI:", error);
    }
  };

  const handleManualRefresh = () => {
    refreshData();
  };

  if (!hasJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">
              Join Collaboration Room
            </h1>
            <p className="text-sm text-slate-300">
              Room: <span className="font-mono text-purple-300">{roomId}</span>
            </p>
          </div>

          <UserNamePrompt onJoin={handleJoin} />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-purple-400"></div>
          <p className="text-lg text-white">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto flex h-screen flex-col p-4">
        {/* Header */}
        <div className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-bold text-white">
                Room: {roomId}
              </h1>
              <p className="text-sm text-slate-300">
                Logged in as:{" "}
                <span className="text-purple-300">{participantName}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isWsConnected ? "bg-green-400" : "bg-yellow-400"
                  }`}
                />
                <span className="text-sm text-slate-300">
                  {isWsConnected ? "WebSocket Connected" : "Manual Mode"}
                </span>
              </div>

              {/* Manual Refresh */}
              {!isWsConnected && (
                <button
                  onClick={handleManualRefresh}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700"
                >
                  Refresh
                </button>
              )}

              {/* Participants Count */}
              <div className="text-sm text-slate-300">
                Participants: {room.participants?.length ?? 0}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-4">
          {/* Participants Sidebar */}
          <div className="w-64 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-lg">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Participants
            </h2>
            <div className="space-y-2">
              {room.participants?.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-lg bg-white/5 p-2"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white">{participant.name}</span>
                </div>
              )) ?? []}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex flex-1 flex-col rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-lg">
            <CollaborationChat
              messages={messages ?? []}
              onSendMessage={handleSendMessage}
              onSendToAI={handleSendToAI}
              isSendingMessage={isSendingMessage}
              isSendingToAI={isSendingToAI}
              currentUser={participantName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const CollaborationChat = ({
  messages,
  onSendMessage,
  onSendToAI,
  isSendingMessage,
  isSendingToAI,
  currentUser,
}: {
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type: "user" | "ai";
  }>;
  onSendMessage: (content: string) => Promise<void>;
  onSendToAI: (content: string) => Promise<void>;
  isSendingMessage: boolean;
  isSendingToAI: boolean;
  currentUser: string;
}) => {
  const [input, setInput] = useState("");
  const [isAIMode, setIsAIMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    try {
      if (isAIMode) {
        await onSendToAI(content);
      } else {
        await onSendMessage(content);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Mode Toggle */}
      <div className="border-b border-white/20 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIMode(false)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              !isAIMode
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            💬 Team Chat
          </button>
          <button
            onClick={() => setIsAIMode(true)}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              isAIMode
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            🤖 AI Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === currentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-2xl px-4 py-2 lg:max-w-md ${
                message.type === "ai"
                  ? "border border-purple-500/30 bg-purple-600/20 text-purple-100"
                  : message.sender === currentUser
                    ? "bg-blue-600 text-white"
                    : "bg-white/20 text-white"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium">
                  {message.type === "ai" ? "🤖 AI Assistant" : message.sender}
                </span>
                <span className="text-xs opacity-60">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <p className="text-sm break-words">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/20 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isAIMode ? "Ask the AI assistant..." : "Type a message..."
            }
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
            disabled={isSendingMessage || isSendingToAI}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSendingMessage || isSendingToAI}
            className={`rounded-xl px-6 py-3 font-medium transition-colors ${
              isAIMode
                ? "bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800"
            } text-white disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isSendingMessage || isSendingToAI ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const UserNamePrompt = ({ onJoin }: { onJoin: (name: string) => void }) => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          What&apos;s your name?
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-800 disabled:opacity-50"
      >
        Join Room
      </button>
    </form>
  );
};
