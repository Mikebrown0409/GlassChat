"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CollaborationPanel } from "~/components/collaboration/CollaborationPanel";
import { useCollaboration } from "~/lib/collaboration/hooks";

export default function CollaboratePage() {
  const searchParams = useSearchParams();
  const roomId = searchParams?.get("room");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const collaboration = useCollaboration(currentRoomId);

  const handleJoinRoom = useCallback(
    async (targetRoomId: string) => {
      if (!collaboration.user) {
        alert("Please create a user first");
        return;
      }

      setIsJoining(true);
      try {
        await collaboration.joinRoom(targetRoomId);
        setCurrentRoomId(targetRoomId);
      } catch (error) {
        console.error("Failed to join room:", error);
        alert("Failed to join room. It may not exist.");
      } finally {
        setIsJoining(false);
      }
    },
    [collaboration],
  );

  // Auto-join room if URL parameter provided
  useEffect(() => {
    if (roomId && !currentRoomId && collaboration.user) {
      void handleJoinRoom(roomId);
    }
  }, [roomId, currentRoomId, collaboration.user, handleJoinRoom]);

  const handleCreateUser = async () => {
    if (!userName.trim()) return;

    try {
      await collaboration.createUser(userName.trim());
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-6">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Collaboration Test Page
          </h1>
          <p className="text-zinc-400">
            Test collaboration features with multiple browser tabs/windows
          </p>
          {roomId && (
            <p className="mt-2 text-blue-400">
              Attempting to join room:{" "}
              <code className="rounded bg-zinc-800 px-2 py-1">{roomId}</code>
            </p>
          )}
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {!collaboration.user ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Create User
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                  />
                  <button
                    onClick={handleCreateUser}
                    disabled={!userName.trim() || collaboration.isCreatingUser}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {collaboration.isCreatingUser ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Welcome, {collaboration.user.name}!
                    </h2>
                    <p className="text-zinc-400">
                      User ID:{" "}
                      <code className="rounded bg-zinc-800 px-2 py-1 text-xs">
                        {collaboration.user.id}
                      </code>
                    </p>
                  </div>
                  <div
                    className="h-8 w-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: collaboration.user.color }}
                  />
                </div>

                {roomId && !currentRoomId && (
                  <button
                    onClick={() => handleJoinRoom(roomId)}
                    disabled={isJoining}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isJoining ? "Joining..." : `Join Room ${roomId}`}
                  </button>
                )}

                {currentRoomId && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-white">Current Room</h3>
                    <p className="text-zinc-400">
                      Room ID:{" "}
                      <code className="rounded bg-zinc-800 px-2 py-1 text-xs">
                        {currentRoomId}
                      </code>
                    </p>
                    <p className="text-zinc-400">
                      Online Users: {collaboration.onlineUsers.length}
                    </p>

                    {/* Display online users */}
                    <div className="flex flex-wrap gap-2">
                      {collaboration.onlineUsers.map((user, index) => {
                        const userName = user.userName ?? user.userId;

                        return (
                          <div
                            key={`${user.userId}-${index}`}
                            className="flex items-center gap-2 rounded bg-zinc-800 px-3 py-1"
                          >
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: user.color ?? "#444" }}
                            />
                            <span className="text-sm text-white">
                              {userName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collaboration Panel */}
          <div className="w-80 border-l border-zinc-800">
            <CollaborationPanel
              currentChatId="test-chat"
              isOpen={true}
              onToggle={() => {
                // No-op for embedded panel
              }}
              embedded={true}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t border-zinc-800 bg-zinc-800/50 p-6">
          <h3 className="mb-2 font-medium text-white">Testing Instructions</h3>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>1. Create a user with a unique name</li>
            <li>2. Create a room using the collaboration panel</li>
            <li>3. Copy the room URL and open it in another tab/window</li>
            <li>4. Create another user and join the same room</li>
            <li>5. Watch user avatars appear in both windows</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
