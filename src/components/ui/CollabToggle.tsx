import { clsx } from "clsx";
import { Copy, LogOut, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCollaborationStore } from "~/lib/collaboration/store";
import { Button } from "./Button";

export function CollabToggle() {
  const { data: session } = useSession();
  const { currentRoomId } = useCollaborationStore();
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Check if Pusher is available (production real-time) vs WebSocket/manual refresh
  const isPusherAvailable = !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleTogglePopup = () => {
    if (buttonRef.current && !showPopup) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }
    setShowPopup(!showPopup);
  };

  const handleJoinRoom = () => {
    if (roomIdInput.trim() && session?.user) {
      // Use authenticated user's name or email as the user identifier
      const userName = session.user.name ?? session.user.email ?? "Anonymous";
      // Use Pusher-based collaboration with URL search parameters
      window.location.href = `/?room=${encodeURIComponent(roomIdInput.trim())}&user=${encodeURIComponent(userName)}`;
    }
  };

  const _handleCreateRoom = () => {
    if (session?.user) {
      const newRoomId = Date.now().toString();
      // Use authenticated user's name or email as the user identifier
      const userName = session.user.name ?? session.user.email ?? "Anonymous";
      setShowPopup(false);
      // Use Pusher-based collaboration with URL search parameters
      window.location.href = `/?room=${newRoomId}&user=${encodeURIComponent(userName)}`;
    }
  };

  const handleLeaveRoom = () => {
    window.location.href = "/";
    setShowPopup(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const copyInviteLink = async () => {
    if (currentRoomId && session?.user) {
      const userName = session.user.name ?? session.user.email ?? "Anonymous";
      const inviteUrl = `${window.location.origin}/?room=${currentRoomId}&user=${encodeURIComponent(userName)}`;
      await navigator.clipboard.writeText(inviteUrl);
      // You could add a toast notification here
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopup]);

  // Determine refresh button text based on real-time capabilities
  const getRefreshButtonText = () => {
    if (isPusherAvailable) {
      return "🔄 Refresh";
    } else if (isDevelopment) {
      return "🔄 Refresh (Dev Mode)";
    } else {
      return "🔄 Refresh (No Real-time)";
    }
  };

  const popup = showPopup && (
    <div
      className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        left: `${popupPosition.x}px`,
        top: `${popupPosition.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="space-y-2">
        {/* Create Room */}
        {!currentRoomId && (
          <button
            onClick={_handleCreateRoom}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Users className="h-4 w-4" />
            Create Room
          </button>
        )}

        {/* Join Room */}
        {!currentRoomId && (
          <button
            onClick={() => {
              setShowPopup(false);
              setShowRoomInput(true);
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 rotate-180" />
            Join Room
          </button>
        )}

        {/* Copy Invite Link */}
        {currentRoomId && (
          <button
            onClick={copyInviteLink}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
            Copy Invite Link
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {getRefreshButtonText()}
        </button>

        {/* Leave Room */}
        {currentRoomId && (
          <button
            onClick={handleLeaveRoom}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4" />
            Leave Room
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={buttonRef} className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePopup}
          className={clsx(
            "flex items-center gap-2",
            currentRoomId && "text-blue-600 dark:text-blue-400",
          )}
        >
          <Users className="h-4 w-4" />
          {currentRoomId ? `Room: ${currentRoomId.slice(-6)}` : "Collaborate"}
        </Button>
      </div>

      {/* Portal for popup */}
      {typeof window !== "undefined" && createPortal(popup, document.body)}

      {/* Room Input Modal */}
      {showRoomInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold">Join Room</h3>
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Enter room ID"
              className="mb-4 w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700"
              onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleJoinRoom} disabled={!roomIdInput.trim()}>
                Join Room
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowRoomInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
