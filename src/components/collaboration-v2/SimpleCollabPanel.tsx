"use client";

import { Share2, Users, X } from "lucide-react";
import { useState } from "react";
import { useCollaboration } from "~/lib/collaboration-v2/hooks";

interface SimpleCollabPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SimpleCollabPanel({
  isOpen,
  onToggle,
}: SimpleCollabPanelProps) {
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const collaboration = useCollaboration();

  const handleCreateRoom = async () => {
    if (!userName.trim() || !roomName.trim()) return;

    const room = await collaboration.createRoom(
      roomName.trim(),
      userName.trim(),
    );
    if (room) {
      setShowCreateRoom(false);
      setRoomName("");
      // Room is automatically joined, so now we can share the link
    }
  };

  const handleShareRoom = () => {
    if (!collaboration.currentRoom) return;

    const shareUrl = `${window.location.origin}/test-collab-v2?room=${collaboration.currentRoom.id}`;
    navigator.clipboard.writeText(shareUrl);

    // Simple notification
    const notification = document.createElement("div");
    notification.textContent = "Room link copied to clipboard!";
    notification.className =
      "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50";
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-4 rounded-full bg-blue-600 p-3 text-white shadow-lg transition-colors hover:bg-blue-700"
        title="Open Collaboration"
      >
        <Users size={24} />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 max-h-96 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold text-gray-900">Collaboration</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {collaboration.error && (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{collaboration.error}</p>
          </div>
        )}

        {!collaboration.isInRoom ? (
          // Not in a room - show create room form
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Create a room to start collaborating
            </p>

            {!showCreateRoom ? (
              <button
                onClick={() => setShowCreateRoom(true)}
                className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Create Room
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateRoom}
                    disabled={
                      !userName.trim() ||
                      !roomName.trim() ||
                      collaboration.isLoading
                    }
                    className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {collaboration.isLoading ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // In a room - show room info and participants
          <div className="space-y-3">
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-900">
                    {collaboration.currentRoom?.name}
                  </p>
                  <p className="text-sm text-green-700">
                    You: {collaboration.currentUser?.name}
                  </p>
                </div>
                <button
                  onClick={handleShareRoom}
                  className="rounded bg-green-600 p-2 text-white hover:bg-green-700"
                  title="Share room link"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Participants */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Participants ({collaboration.otherParticipants.length + 1})
              </p>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {/* Current user */}
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

                {/* Other participants */}
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

            <button
              onClick={collaboration.leaveRoom}
              disabled={collaboration.isLoading}
              className="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {collaboration.isLoading ? "Leaving..." : "Leave Room"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
