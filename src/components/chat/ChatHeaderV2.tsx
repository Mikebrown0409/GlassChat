"use client";

import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { CollabToggle } from "~/components/ui/CollabToggle";
import { InsightsToggle } from "~/components/ui/InsightsToggle";
import { ThemeSwitcher } from "~/components/ui/ThemeSwitcher";

interface ChatHeaderV2Props {
  title?: string;
  isCollaborationMode?: boolean;
  collaborationRoom?: {
    id: string;
    name?: string;
    users: Array<{ id: string; name: string }>;
  };
  isWsConnected?: boolean;
  onRefreshData?: () => void;
  onToggleSidebar?: () => void;
  onToggleInsights?: () => void;
  insightsOpen?: boolean;
  className?: string;
}

export const ChatHeaderV2 = ({
  title = "Chat",
  isCollaborationMode = false,
  collaborationRoom,
  isWsConnected = false,
  onRefreshData,
  onToggleSidebar,
  onToggleInsights,
  insightsOpen = false,
  className = "",
}: ChatHeaderV2Props) => {
  const [showRoomDetails, setShowRoomDetails] = useState(false);

  const getRoomDisplayName = () => {
    if (!collaborationRoom) return title;
    return collaborationRoom.name ?? `Room ${collaborationRoom.id}`;
  };

  const getConnectionStatus = () => {
    if (!isCollaborationMode) return null;

    return (
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isWsConnected ? "bg-green-400" : "bg-yellow-400"
          }`}
          title={isWsConnected ? "Real-time connected" : "Manual refresh mode"}
        />
        <span className="text-xs text-gray-500">
          {isWsConnected ? "Live" : "Manual"}
        </span>
      </div>
    );
  };

  const getParticipantInfo = () => {
    if (!isCollaborationMode || !collaborationRoom) return null;

    const participantCount = collaborationRoom.users.length;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          👥 {participantCount} participant{participantCount !== 1 ? "s" : ""}
        </span>
        {participantCount > 0 && (
          <button
            onClick={() => setShowRoomDetails(!showRoomDetails)}
            className="text-xs text-blue-600 underline hover:text-blue-700"
          >
            {showRoomDetails ? "Hide" : "Show"} details
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`border-b border-gray-200 bg-white ${className}`}>
      {/* Main Header */}
      <div className="flex items-center justify-between p-4">
        {/* Left Side - Title and Room Info */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          {onToggleSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="sm"
              className="lg:hidden"
            >
              ☰
            </Button>
          )}

          {/* Title and Room Status */}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900">
              {getRoomDisplayName()}
              {isCollaborationMode && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Collaboration
                </span>
              )}
            </h1>

            {/* Room metadata */}
            <div className="mt-1 flex items-center gap-4">
              {getConnectionStatus()}
              {getParticipantInfo()}
            </div>
          </div>
        </div>

        {/* Right Side - Controls */}
        <div className="flex items-center gap-2">
          {/* Manual Refresh for Collaboration */}
          {isCollaborationMode && !isWsConnected && onRefreshData && (
            <Button
              onClick={onRefreshData}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🔄 Refresh
            </Button>
          )}

          {/* Collaboration Toggle */}
          <CollabToggle />

          {/* Insights Toggle */}
          {onToggleInsights && (
            <InsightsToggle isOpen={insightsOpen} onClick={onToggleInsights} />
          )}

          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>
      </div>

      {/* Room Details Panel (Expandable) */}
      {showRoomDetails && isCollaborationMode && collaborationRoom && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Room Info */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-900">
                Room Information
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Room ID:</span>{" "}
                  {collaborationRoom.id}
                </div>
                <div>
                  <span className="font-medium">Connection:</span>{" "}
                  {isWsConnected ? (
                    <span className="text-green-600">Real-time WebSocket</span>
                  ) : (
                    <span className="text-yellow-600">Manual refresh mode</span>
                  )}
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-900">
                Participants
              </h3>
              <div className="space-y-2">
                {collaborationRoom.users.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Room Actions */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const roomUrl = `${window.location.origin}${window.location.pathname}?room=${collaborationRoom.id}`;
                  void navigator.clipboard.writeText(roomUrl);
                  // TODO: Show toast notification
                  console.log("Room URL copied to clipboard:", roomUrl);
                }}
                variant="outline"
                size="sm"
              >
                📋 Copy Room Link
              </Button>

              {!isWsConnected && onRefreshData && (
                <Button onClick={onRefreshData} variant="outline" size="sm">
                  🔄 Refresh Data
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
