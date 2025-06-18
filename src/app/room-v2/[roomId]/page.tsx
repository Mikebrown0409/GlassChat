"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCollaboration } from "~/lib/collaboration-v2/hooks";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const collaboration = useCollaboration(roomId, userName);

  // Auto-redirect effects
  useEffect(() => {
    // If roomId is not available, redirect to home
    if (!roomId) {
      router.push("/");
      return;
    }

    // If we have successfully joined a room, redirect to main chat
    if (collaboration.room && userName.trim()) {
      router.push(`/?room=${roomId}`);
    }
  }, [collaboration.room, roomId, router, userName]);

  const handleJoinRoom = () => {
    if (!userName.trim() || !roomId) return;

    setIsJoining(true);
    try {
      collaboration.joinRoom();
      // After joining, redirect to main chat
      router.push(`/?room=${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsJoining(false);
    }
  };

  // Show loading if joining
  if (collaboration.isJoining || (collaboration.room && userName.trim())) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Joining room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Join Collaboration Room
          </h1>
          <p className="text-gray-600">Enter your name to join the chat</p>
        </div>

        {collaboration.error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{collaboration.error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="userName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              disabled={isJoining}
              autoFocus
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!userName.trim() || isJoining || collaboration.isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isJoining || collaboration.isLoading ? "Joining..." : "Join Room"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to main chat
          </button>
        </div>
      </div>
    </div>
  );
}
 