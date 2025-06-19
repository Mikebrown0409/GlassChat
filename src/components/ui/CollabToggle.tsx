import { clsx } from "clsx";
import { Copy, LogOut, Plus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCollaborationStore } from "~/lib/collaboration/store";
import { Button } from "./Button";

export function CollabToggle() {
  const { currentRoomId } = useCollaborationStore();
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [copySuccess, setCopySuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if Pusher is available (production real-time)
  const isPusherAvailable = !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );

  // Collaboration is active when we're actually in a room
  const isInRoom = !!currentRoomId;

  // Calculate popup position when it opens
  useEffect(() => {
    if (showPopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8, // 8px below the button
        left: rect.right - 256, // 256px = w-64, align right edge
      });
    }
  }, [showPopup]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      setTimeout(() => {
        if (
          popupRef.current &&
          !popupRef.current.contains(event.target as Node)
        ) {
          setShowPopup(false);
          setShowRoomInput(false);
        }
      }, 0);
    }

    if (showPopup) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }

    // Return empty cleanup function for when not showing popup
    return () => {
      // Cleanup function
    };
  }, [showPopup]);

  const handleJoinRoom = () => {
    if (roomIdInput.trim()) {
      console.log("🚪 Joining room:", roomIdInput.trim());
      // Navigate to room URL - the ChatInterface will handle joining
      window.location.href = `/?room=${encodeURIComponent(roomIdInput.trim())}`;
      setShowPopup(false);
    }
  };

  const handleLeaveRoom = () => {
    console.log("🚪 Leaving room");
    // Clear room from URL and reload
    window.location.href = "/";
  };

  const handleCreateRoom = () => {
    // Generate a simple room ID and join it
    const newRoomId = `room-${Date.now()}`;
    console.log("🆕 Creating new room:", newRoomId);
    window.location.href = `/?room=${newRoomId}`;
    setShowPopup(false);
  };

  const handleCopyInviteLink = async () => {
    if (!currentRoomId) return;

    const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(currentRoomId)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      console.log("📋 Invite link copied to clipboard");
      setCopySuccess(true);

      // Hide success message after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
      // Fallback: select the text
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleManualRefresh = () => {
    if (!currentRoomId) return;

    setIsRefreshing(true);
    console.log("🔄 Manually refreshing page for collaboration sync");

    // Simple page refresh to sync collaboration data
    setTimeout(() => {
      window.location.reload();
    }, 200); // Brief delay for visual feedback
  };

  const handleToggleClick = () => {
    setShowPopup(!showPopup);
  };

  // Get refresh button text based on real-time capabilities
  const getRefreshButtonText = () => {
    if (isRefreshing) return "Refreshing...";
    if (isPusherAvailable) {
      return "Refresh Room";
    } else {
      return "Refresh (Real-time Unavailable)";
    }
  };

  // Popup content to be rendered in portal
  const popupContent = (
    <div
      className="fixed w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-lg"
      ref={popupRef}
      style={{
        top: popupPosition.top,
        left: popupPosition.left,
        zIndex: 99999,
      }}
    >
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">Collaboration</h3>

        {currentRoomId ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-300">
              Current room:{" "}
              <span className="font-mono text-blue-400">{currentRoomId}</span>
            </p>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyInviteLink}
              className="w-full text-xs"
              disabled={copySuccess}
            >
              <Copy size={12} className="mr-1" />
              {copySuccess ? "✓ Link Copied!" : "Copy Invite Link"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              className="w-full text-xs"
              disabled={isRefreshing}
            >
              <span className={`mr-1 ${isRefreshing ? "animate-spin" : ""}`}>
                🔄
              </span>
              {getRefreshButtonText()}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleLeaveRoom}
              className="w-full text-xs"
            >
              <LogOut size={12} className="mr-1" />
              Leave Room
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Not in a room yet</p>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateRoom}
              className="w-full text-xs"
            >
              <Plus size={12} className="mr-1" />
              Create New Room
            </Button>

            <div className="border-t border-zinc-700 pt-2">
              {showRoomInput ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="Enter room ID..."
                    className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white placeholder-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleJoinRoom();
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleJoinRoom}
                      disabled={!roomIdInput.trim()}
                      className="flex-1 text-xs"
                    >
                      Join
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRoomInput(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRoomInput(true)}
                  className="w-full text-xs"
                >
                  Join Existing Room
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleToggleClick}
        title={isInRoom ? "Leave room" : "Enable collaboration"}
        className={clsx(isInRoom && "bg-blue-600/20 text-blue-400")}
      >
        <Users size={18} />
      </Button>

      {/* Render popup in portal to escape stacking context */}
      {showPopup &&
        typeof window !== "undefined" &&
        createPortal(popupContent, document.body)}
    </div>
  );
}
