"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCollaboration } from "~/lib/collaboration-v2/hooks";

export default function TestCollabV2() {
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams?.get("room");

  const [roomId, setRoomId] = useState(roomIdFromUrl || "");
  const [userName, setUserName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAIChatMode, setIsAIChatMode] = useState(false);

  // Use the collaboration hook
  const {
    room,
    messages,
    isLoading,
    joinRoom,
    sendMessage,
    sendMessageToAI,
    isJoining,
    isSending,
    isSendingToAI,
    isWebSocketConnected,
    refreshData,
  } = useCollaboration(hasJoined ? roomId : "", hasJoined ? userName : "");

  // Auto-join if room is provided in URL
  useEffect(() => {
    if (roomIdFromUrl && !hasJoined) {
      const name = prompt(`Enter your name to join room ${roomIdFromUrl}:`);
      if (name) {
        setUserName(name);
        setRoomId(roomIdFromUrl);
        setHasJoined(true);
      }
    }
  }, [roomIdFromUrl, hasJoined]);

  const handleJoinRoom = () => {
    if (roomId.trim() && userName.trim()) {
      setHasJoined(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get("message") as string;

    if (content.trim()) {
      try {
        if (isAIChatMode) {
          await sendMessageToAI(content);
        } else {
          await sendMessage(content);
        }
        form.reset();
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/test-collab-v2?room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert("Room link copied to clipboard!");
  };

  // Handle manual refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
              Join Collaboration Room
            </h1>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room ID"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim() || !userName.trim() || isJoining}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Room: {roomId}</h1>
                <p className="text-blue-100">Connected as {userName}</p>
                <div className="mt-1 flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${isWebSocketConnected ? "bg-green-400" : "bg-yellow-400"}`}
                  ></div>
                  <span className="text-sm text-blue-100">
                    {isWebSocketConnected
                      ? "Real-time connected"
                      : "Manual refresh mode"}
                  </span>
                  {!isWebSocketConnected && (
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="ml-2 rounded bg-blue-500 px-2 py-1 text-xs hover:bg-blue-400 disabled:opacity-50"
                    >
                      {isRefreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={copyRoomLink}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400"
              >
                Copy Room Link
              </button>
            </div>
          </div>

          {/* Info banner for manual mode */}
          {!isWebSocketConnected && (
            <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Manual refresh mode:</strong> WebSocket isn't
                    available in this environment. Click the refresh button to
                    see updates from other participants. No background polling =
                    perfect for Vercel!
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex h-96">
            {/* Participants Sidebar */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">
                  Participants ({room?.participants?.length || 0})
                </h2>
                {!isWebSocketConnected && (
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    title="Refresh participant list"
                  >
                    {isRefreshing ? "..." : "🔄"}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {room?.participants?.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-2 rounded-lg bg-white p-2 shadow-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">
                      {participant.name}
                    </span>
                  </div>
                ))}
              </div>
              {isLoading && (
                <div className="mt-2 text-sm text-gray-500">Loading...</div>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex flex-1 flex-col">
              {/* Chat Mode Toggle */}
              <div className="border-b border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">
                    {isAIChatMode ? "AI Chat" : "Team Chat"}
                  </h3>
                  <button
                    onClick={() => setIsAIChatMode(!isAIChatMode)}
                    className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                      isAIChatMode
                        ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {isAIChatMode ? "🤖 AI Mode" : "👥 Team Mode"}
                  </button>
                </div>
                {isAIChatMode && (
                  <p className="mt-1 text-xs text-gray-500">
                    AI responses will be visible to all participants
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex space-x-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${
                          message.type === "ai"
                            ? "bg-purple-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {message.type === "ai"
                          ? "🤖"
                          : message.sender.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-medium ${
                              message.type === "ai"
                                ? "text-purple-800"
                                : "text-gray-800"
                            }`}
                          >
                            {message.sender}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                          {message.type === "ai" && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">
                              AI
                            </span>
                          )}
                        </div>
                        <div
                          className={`mt-1 rounded-lg p-3 ${
                            message.type === "ai"
                              ? "border border-purple-100 bg-purple-50"
                              : "bg-gray-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-gray-800">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    name="message"
                    type="text"
                    placeholder={
                      isAIChatMode
                        ? "Ask the AI assistant..."
                        : "Type a message..."
                    }
                    className={`flex-1 rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 ${
                      isAIChatMode
                        ? "border-purple-300 focus:ring-purple-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    disabled={isSending || isSendingToAI}
                  />
                  <button
                    type="submit"
                    disabled={isSending || isSendingToAI}
                    className={`rounded-lg px-6 py-2 font-medium text-white disabled:opacity-50 ${
                      isAIChatMode
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isSending || isSendingToAI
                      ? "..."
                      : isAIChatMode
                        ? "Ask AI"
                        : "Send"}
                  </button>
                </form>
                {!isWebSocketConnected && (
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Tip: Click refresh to see new messages from others
                    (sending updates your own view)
                  </p>
                )}
                {isAIChatMode && (
                  <p className="mt-2 text-xs text-purple-600">
                    🤖 AI responses are powered by Gemini and shared with all
                    participants
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            {isWebSocketConnected
              ? "✅ Real-time updates via WebSocket • Zero function calls • Perfect for Vercel"
              : "🔄 Manual refresh mode • Zero background polling • Perfect for Vercel limits"}
          </p>
          <p className="mt-1 text-xs">
            WebSocket may not work in development mode - this is normal and
            expected
          </p>
        </div>
      </div>
    </div>
  );
}
