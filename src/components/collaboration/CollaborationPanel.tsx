"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Code,
  MessageCircle,
  Play,
  Send,
  Share2,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCollaboration } from "~/lib/collaboration/hooks";
import {
  CollaborationEventType,
  type CollaborationEvent,
  type CollaborationMessage,
  type CollaborationRoom,
  type CollaborationUser,
  type TypingIndicator,
  type UserPresence,
} from "~/lib/collaboration/types";

interface CollaborationPanelProps {
  currentChatId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

export function CollaborationPanel({
  currentChatId,
  isOpen,
  onToggle,
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "rooms" | "messages" | "live-coding" | "users"
  >("rooms");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [userName, setUserName] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [copied, setCopied] = useState(false);

  const collaboration = useCollaboration(currentRoomId);

  // Auto-create user if not exists
  useEffect(() => {
    if (!collaboration.user.user && !showUserSetup) {
      setShowUserSetup(true);
    }
  }, [collaboration.user.user, showUserSetup]);

  // Listen for collaboration events
  useEffect(() => {
    if (!currentRoomId) return;

    const handleUserJoined = (event: CollaborationEvent) => {
      const userData = event.data as { user: { name: string } };
      console.log("User joined:", userData.user.name);
    };

    const handleUserLeft = (event: CollaborationEvent) => {
      const userData = event.data as { user: { name: string } };
      console.log("User left:", userData.user.name);
    };

    const handleModeSwitch = (event: CollaborationEvent) => {
      const modeData = event.data as { isLiveCodingMode: boolean };
      console.log(
        "Live coding mode:",
        modeData.isLiveCodingMode ? "enabled" : "disabled",
      );
    };

    // Defensive programming - check if functions exist before calling
    if (
      collaboration.events &&
      typeof collaboration.events.addEventListener === "function"
    ) {
      collaboration.events.addEventListener(
        CollaborationEventType.USER_JOINED,
        handleUserJoined,
      );
      collaboration.events.addEventListener(
        CollaborationEventType.USER_LEFT,
        handleUserLeft,
      );
      collaboration.events.addEventListener(
        CollaborationEventType.MODE_SWITCHED,
        handleModeSwitch,
      );

      return () => {
        if (
          collaboration.events &&
          typeof collaboration.events.removeEventListener === "function"
        ) {
          collaboration.events.removeEventListener(
            CollaborationEventType.USER_JOINED,
            handleUserJoined,
          );
          collaboration.events.removeEventListener(
            CollaborationEventType.USER_LEFT,
            handleUserLeft,
          );
          collaboration.events.removeEventListener(
            CollaborationEventType.MODE_SWITCHED,
            handleModeSwitch,
          );
        }
      };
    } else {
      console.error(
        "addEventListener function not found on collaboration.events:",
        collaboration.events,
      );
      return;
    }
  }, [currentRoomId, collaboration.events]);

  const handleCreateUser = async () => {
    if (!userName.trim()) return;

    try {
      await collaboration.user.createUser(userName.trim());
      setShowUserSetup(false);

      // Auto-create or join a room for the current chat
      if (currentChatId && collaboration.rooms.rooms.length === 0) {
        void handleCreateRoom();
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  const handleCreateRoom = async () => {
    if (!currentChatId || !collaboration.user.user) return;

    try {
      const room = await collaboration.rooms.createRoom(
        currentChatId,
        `Chat Room`,
      );
      if (room.success && room.room) {
        setCurrentRoomId(room.room.id);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await collaboration.rooms.joinRoom(roomId);
      setCurrentRoomId(roomId);
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoomId) return;

    try {
      await collaboration.rooms.leaveRoom(currentRoomId);
      setCurrentRoomId(null);
    } catch (error) {
      console.error("Failed to leave room:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentRoomId) return;

    try {
      await collaboration.messages.sendMessage(messageInput.trim(), "text");
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleShareRoom = async () => {
    if (!currentRoomId) return;

    const shareUrl = `${window.location.origin}/collaborate?room=${currentRoomId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  if (showUserSetup) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
            className="border-border-subtle bg-surface-0/70 glass-effect fixed top-0 right-0 z-40 h-full w-80 border-l backdrop-blur-lg"
          >
            <div className="flex h-full flex-col p-6">
              <div className="mb-6">
                <h2 className="text-primary text-xl font-semibold">
                  Welcome to Collaboration
                </h2>
                <p className="text-muted mt-2 text-sm">
                  Enter your name to start collaborating in real-time with
                  others. You&apos;ll be able to share rooms, chat, and even
                  code together!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-muted mb-2 block text-xs font-medium">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                    placeholder="Enter your display name"
                    className="bg-surface-1/60 border-border-subtle text-primary placeholder:text-muted focus:ring-brand-primary w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-none"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleCreateUser}
                  disabled={!userName.trim() || collaboration.user.isCreating}
                  className="bg-brand-primary hover:bg-brand-primary/80 w-full rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {collaboration.user.isCreating
                    ? "Creating..."
                    : "Join Collaboration"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
          className="border-border-subtle bg-surface-0/70 glass-effect fixed top-0 right-0 z-40 h-full w-80 border-l backdrop-blur-lg"
        >
          {/* Header */}
          <div className="border-border-subtle bg-surface-1/70 border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-primary text-lg font-semibold">
                Collaboration
              </h2>
              <button
                onClick={onToggle}
                className="text-muted hover:bg-surface-1/60 hover:text-primary rounded-lg p-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Info */}
            {collaboration.user.user && (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: collaboration.user.user.color }}
                >
                  {collaboration.user.user.name[0]?.toUpperCase()}
                </div>
                <span className="text-primary/80 text-sm">
                  {collaboration.user.user.name}
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-border-subtle border-b">
            <div className="flex">
              {[
                { id: "rooms", label: "Rooms", icon: Users },
                { id: "messages", label: "Chat", icon: MessageCircle },
                { id: "live-coding", label: "Live Code", icon: Code },
                { id: "users", label: "Users", icon: Users },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() =>
                    setActiveTab(
                      id as "rooms" | "messages" | "live-coding" | "users",
                    )
                  }
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === id
                      ? "border-brand-primary text-primary bg-surface-1/60"
                      : "text-muted hover:text-primary border-transparent",
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "rooms" && (
              <RoomsTab
                rooms={collaboration.rooms.rooms}
                currentRoomId={currentRoomId}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onLeaveRoom={handleLeaveRoom}
                onShareRoom={handleShareRoom}
                isCreating={collaboration.rooms.isCreating}
                isJoining={collaboration.rooms.isJoining}
                copied={copied}
              />
            )}

            {activeTab === "messages" && currentRoomId && (
              <ChatTab
                _roomId={currentRoomId}
                messages={collaboration.messages.messages}
                messageInput={messageInput}
                onMessageInputChange={setMessageInput}
                onSendMessage={handleSendMessage}
                currentUser={collaboration.user.user}
                typingUsers={collaboration.typing.typingUsers}
              />
            )}

            {activeTab === "messages" && !currentRoomId && (
              <div className="py-8 text-center">
                <MessageCircle
                  size={48}
                  className="mx-auto mb-4 text-slate-600"
                />
                <h3 className="mb-2 text-lg font-medium text-white">
                  No Room Connected
                </h3>
                <p className="mb-4 text-sm text-slate-400">
                  Join or create a room to start chatting with others
                </p>
                <button
                  onClick={() => setActiveTab("rooms")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Go to Rooms
                </button>
              </div>
            )}

            {activeTab === "live-coding" && currentRoomId && (
              <LiveCodingTab
                _roomId={currentRoomId}
                liveCoding={collaboration.liveCoding}
                currentUser={collaboration.user.user}
              />
            )}

            {activeTab === "live-coding" && !currentRoomId && (
              <div className="py-8 text-center">
                <Code size={48} className="mx-auto mb-4 text-slate-600" />
                <h3 className="mb-2 text-lg font-medium text-white">
                  No Room Connected
                </h3>
                <p className="mb-4 text-sm text-slate-400">
                  Join or create a room to start live coding together
                </p>
                <button
                  onClick={() => setActiveTab("rooms")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Go to Rooms
                </button>
              </div>
            )}

            {activeTab === "users" && currentRoomId && (
              <UsersTab
                _roomId={currentRoomId}
                onlineUsers={collaboration.presence.onlineUsers}
                typingUsers={collaboration.typing.typingUsers}
              />
            )}

            {activeTab === "users" && !currentRoomId && (
              <div className="py-8 text-center">
                <Users size={48} className="mx-auto mb-4 text-slate-600" />
                <h3 className="mb-2 text-lg font-medium text-white">
                  No Room Connected
                </h3>
                <p className="mb-4 text-sm text-slate-400">
                  Join or create a room to see who&apos;s online
                </p>
                <button
                  onClick={() => setActiveTab("rooms")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Go to Rooms
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Rooms Tab Component
function RoomsTab({
  rooms,
  currentRoomId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onShareRoom,
  isCreating,
  isJoining,
  copied,
}: {
  rooms: CollaborationRoom[];
  currentRoomId: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onShareRoom: () => void;
  isCreating: boolean;
  isJoining: boolean;
  copied: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Quick Start Guide */}
      {rooms.length === 0 && !currentRoomId && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Play size={16} className="text-blue-400" />
            <h3 className="text-sm font-medium text-white">Quick Start</h3>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Create a room to start collaborating with others in real-time!
          </p>
          <div className="text-xs text-slate-500">
            • Share chat messages instantly
            <br />
            • Code together in live coding mode
            <br />• See who&apos;s online and typing
          </div>
        </div>
      )}

      <button
        onClick={onCreateRoom}
        disabled={isCreating}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-50"
      >
        <UserPlus size={16} />
        {isCreating ? "Creating..." : "Create New Room"}
      </button>

      {currentRoomId && (
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-medium text-green-400">
                Connected to room
              </span>
            </div>
            <button
              onClick={onLeaveRoom}
              className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-600/30"
            >
              Leave
            </button>
          </div>
          <button
            onClick={onShareRoom}
            className="flex w-full items-center justify-center gap-2 rounded bg-blue-600/20 px-3 py-2 text-xs text-blue-400 transition-colors hover:bg-blue-600/30"
          >
            {copied ? (
              <>
                <Check size={12} />
                Copied!
              </>
            ) : (
              <>
                <Share2 size={12} />
                Share Room Link
              </>
            )}
          </button>
        </div>
      )}

      {rooms.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
            Available Rooms
          </h4>
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={clsx(
                  "rounded-lg border p-3 transition-colors",
                  currentRoomId === room.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-600 bg-slate-800/50 hover:border-slate-500",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                      {room.name}
                      {room.isLiveCodingMode && (
                        <span className="rounded bg-purple-600/20 px-2 py-0.5 text-xs text-purple-400">
                          Live Code
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {room.users.length} users online
                    </p>
                  </div>
                  {currentRoomId !== room.id && (
                    <button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={isJoining}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      Join
                    </button>
                  )}
                  {currentRoomId === room.id && (
                    <span className="text-xs font-medium text-green-400">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Chat Tab Component
function ChatTab({
  _roomId,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  currentUser,
  typingUsers,
}: {
  _roomId: string;
  messages: CollaborationMessage[];
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  currentUser: CollaborationUser | null;
  typingUsers: TypingIndicator[];
}) {
  return (
    <div className="flex h-full max-h-[calc(100vh-280px)] flex-col">
      {/* Messages Area */}
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-500">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                "max-w-[85%] rounded-lg p-3",
                message.userId === currentUser?.id
                  ? "ml-auto bg-blue-600/20 text-blue-100"
                  : "bg-slate-800/50 text-slate-200",
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {message.userId === currentUser?.id
                    ? "You"
                    : `User ${message.userId.slice(0, 8)}`}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm">{message.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="mb-2 text-xs text-slate-400">
          {typingUsers.map((user) => user.userName).join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => onMessageInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button
          onClick={onSendMessage}
          disabled={!messageInput.trim()}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// Live Coding Tab Component
function LiveCodingTab({
  _roomId,
  liveCoding,
  currentUser,
}: {
  _roomId: string;
  liveCoding: {
    localContent?: string;
    updateCode: (
      code: string,
      cursorPosition?: { line: number; column: number },
    ) => Promise<void>;
    toggleLiveCodingMode: () => Promise<{
      success: boolean;
      isLiveCodingMode?: boolean;
      error?: string;
    }>;
    isLiveCodingMode: boolean;
    isToggling: boolean;
    session?: {
      version: number;
      lastModifiedBy: string;
    } | null;
    isUpdating: boolean;
    lastSyncTime?: number;
  };
  currentUser: CollaborationUser | null;
}) {
  // Use localContent from the hook for immediate UI updates and conflict prevention
  const code = liveCoding.localContent ?? "";

  const handleCodeChange = (newCode: string) => {
    // No need to set local state - the hook handles local updates and syncing
    void liveCoding.updateCode(newCode);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Live Coding Mode</h3>
        <button
          onClick={() => liveCoding.toggleLiveCodingMode()}
          disabled={liveCoding.isToggling}
          className={clsx(
            "rounded-md px-3 py-1 text-xs transition-colors",
            liveCoding.isLiveCodingMode
              ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
              : "bg-slate-600 text-slate-300 hover:bg-slate-500",
          )}
        >
          {liveCoding.isToggling
            ? "Switching..."
            : liveCoding.isLiveCodingMode
              ? "Enabled"
              : "Enable"}
        </button>
      </div>

      {liveCoding.isLiveCodingMode && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Code size={14} className="text-purple-400" />
              <span className="text-xs font-medium text-white">
                Collaborative Editor
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time code collaboration • Auto-saves • Version tracking
            </p>
          </div>

          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="// Start coding together!
console.log('Hello, collaboration!');

function collaborate() {
  return 'Amazing teamwork!';
}"
              className="h-56 w-full resize-none rounded-lg border border-slate-600 bg-slate-900 p-4 font-mono text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
              spellCheck={false}
            />
            <div className="absolute top-2 right-2 rounded bg-slate-800/80 px-2 py-1 text-xs text-slate-500">
              JavaScript
            </div>
          </div>

          {liveCoding.session && (
            <div className="flex items-center justify-between rounded-lg bg-slate-800/50 p-2 text-xs text-slate-400">
              <span>
                Version {liveCoding.session.version} • Last modified by{" "}
                <span className="text-purple-400">
                  {liveCoding.session.lastModifiedBy === currentUser?.id
                    ? "you"
                    : "another user"}
                </span>
              </span>
              <div className="flex items-center gap-2">
                {liveCoding.isUpdating ? (
                  <span className="text-blue-400">● Saving...</span>
                ) : liveCoding.lastSyncTime &&
                  Date.now() - liveCoding.lastSyncTime < 3000 ? (
                  <span className="text-green-400">● Synced</span>
                ) : (
                  <span className="text-slate-500">● Ready</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!liveCoding.isLiveCodingMode && (
        <div className="py-8 text-center">
          <Code size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            Live Coding Disabled
          </h3>
          <p className="mb-4 text-sm text-slate-400">
            Enable live coding mode to start collaborative programming
          </p>
          <div className="text-xs text-slate-500">
            • Real-time code synchronization
            <br />
            • Multiple cursor support
            <br />• Version history tracking
          </div>
        </div>
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({
  _roomId,
  onlineUsers,
  typingUsers,
}: {
  _roomId: string;
  onlineUsers: UserPresence[];
  typingUsers: TypingIndicator[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-medium text-white">
          Online Users ({onlineUsers.length})
        </h3>
        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <Wifi size={14} className="text-green-400" />
              </div>
              <span className="text-sm text-slate-300">
                User {user.userId.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {typingUsers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-white">
            Currently Typing
          </h3>
          <div className="space-y-2">
            {typingUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3"
              >
                <div className="text-blue-400">...</div>
                <span className="text-sm text-blue-300">{user.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
