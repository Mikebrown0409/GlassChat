"use client";

import { clsx } from "clsx";
import type { Easing } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  MessageCircle,
  MoreVertical,
  Pencil,
  Play,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { memo, useDeferredValue, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useCollaboration } from "~/lib/collaboration/hooks";
import { useCollaborationStore } from "~/lib/collaboration/store";
import {
  Role,
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
  embedded?: boolean;
}

const DYNAMIC_EASE: Easing = [0.22, 1, 0.36, 1] as const;

export function CollaborationPanel({
  currentChatId,
  isOpen,
  onToggle,
  embedded = false,
}: CollaborationPanelProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"rooms" | "messages" | "users">(
    "rooms",
  );
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("collabRoomId");
  });
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [userName, setUserName] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [copied, setCopied] = useState(false);

  const collaboration = useCollaboration(currentRoomId);

  // Sync state to global collaboration store for cross-component awareness
  const setCurrentRoomIdGlobal = useCollaborationStore(
    (s) => s.setCurrentRoomId,
  );
  const setOnlineUsersGlobal = useCollaborationStore((s) => s.setOnlineUsers);

  // Update global room id when local changes
  useEffect(() => {
    setCurrentRoomIdGlobal(currentRoomId);
    if (typeof window !== "undefined") {
      if (currentRoomId) localStorage.setItem("collabRoomId", currentRoomId);
      else localStorage.removeItem("collabRoomId");
    }
  }, [currentRoomId, setCurrentRoomIdGlobal]);

  // Update global online users when data changes
  useEffect(() => {
    setOnlineUsersGlobal(collaboration.onlineUsers ?? []);
  }, [collaboration.onlineUsers, setOnlineUsersGlobal]);

  // Derive online users from room data if presence array empty
  useEffect(() => {
    if (!currentRoomId) return;
    if (collaboration.onlineUsers.length === 0) {
      const room = collaboration.rooms.find((r) => r.id === currentRoomId);
      if (room) {
        const derived = room.users.map((u) => ({
          userId: u.id,
          roomId: currentRoomId,
          isOnline: true,
          lastSeen: Date.now(),
          isTyping: false,
          color: u.color,
        }));
        setOnlineUsersGlobal(derived);
      }
    }
  }, [
    collaboration.onlineUsers.length,
    collaboration.rooms,
    currentRoomId,
    setOnlineUsersGlobal,
  ]);

  // IMPROVED: Auto-create user if not exists (with duplicate prevention)
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false);

  useEffect(() => {
    if (
      !collaboration.user &&
      !collaboration.isCreating &&
      !showUserSetup &&
      !autoCreateAttempted
    ) {
      // Try to auto-create user from authenticated session, show setup if it fails
      const userName = session?.user?.name || session?.user?.email;
      if (userName) {
        setAutoCreateAttempted(true);
        void collaboration
          .createUser(userName)
          .then(() => {
            console.log("✅ Auto-created collaboration user in panel");
          })
          .catch((error) => {
            console.error("❌ Auto-creation failed in panel:", error);
            // If auto-creation fails, show setup for manual user creation
            setShowUserSetup(true);
            setAutoCreateAttempted(false); // Allow retry
          });
      } else {
        // No session data available, show setup for manual user creation
        setShowUserSetup(true);
      }
    }
  }, [
    collaboration.user,
    collaboration.isCreating,
    showUserSetup,
    collaboration.createUser,
    session,
    autoCreateAttempted,
  ]);

  // Track join attempts to prevent infinite loops
  const [joinAttempts, setJoinAttempts] = useState<Set<string>>(new Set());

  // DISABLED: Auto rejoin logic moved to main useCollaboration hook to prevent duplicate joins
  // This was causing infinite loops and duplicate mutations
  useEffect(() => {
    // Just ensure we don't have stale join attempts
    if (!currentRoomId && joinAttempts.size > 0) {
      setJoinAttempts(new Set());
    }
  }, [currentRoomId, joinAttempts.size]);

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

    // Events are now handled through polling in the collaboration hook
    // Disabled excessive event logging for performance
    // if (collaboration.events && collaboration.events.length > 0) {
    //   console.log("Recent collaboration events:", collaboration.events);
    // }

    // No cleanup needed since we're not using event listeners anymore
    return undefined;
  }, [currentRoomId, collaboration.events]);

  const handleCreateUser = async () => {
    if (!userName.trim()) return;

    try {
      await collaboration.createUser(userName.trim());
      setShowUserSetup(false);

      // Auto-create or join a room for the current chat
      if (currentChatId && collaboration.rooms.length === 0) {
        void handleCreateRoom();
      }
    } catch (error: unknown) {
      console.error("Failed to create user:", error);
    }
  };

  const handleCreateRoom = async () => {
    if (!currentChatId) return;

    // Ensure we have a collaboration user before creating room
    if (!collaboration.user && !collaboration.isCreating) {
      try {
        // Get user name from session or use a default
        const userName =
          session?.user?.name || session?.user?.email || `User-${Date.now()}`;
        await collaboration.createUser(userName);
      } catch (error) {
        console.error("Failed to create collaboration user:", error);
        return;
      }
    } else if (collaboration.isCreating) {
      // Wait for user creation to complete
      console.log("Waiting for user creation to complete...");
      return;
    }

    try {
      // Use a predictable chatId pattern that matches invite-created rooms
      const roomChatId = `shared-room-${Date.now()}`;
      const room = await collaboration.createRoom(roomChatId, `Chat Room`);
      if (room.success && room.room) {
        setCurrentRoomId(room.room.id);

        // Wait a moment for presence to establish
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log("Room created successfully:", room.room.id);

        // Set initial users immediately from room data
        const initialUsers = (room.room?.users ?? []).map((u) => ({
          userId: u.id,
          userName: u.name,
          roomId: room.room?.id ?? "",
          isOnline: true,
          lastSeen: Date.now(),
          isTyping: false,
          color: u.color,
        }));
        setOnlineUsersGlobal(initialUsers);

        // Set active tab to show users
        setActiveTab("users");
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      const joinRes = await collaboration.joinRoom(roomId);
      setCurrentRoomId(roomId);

      if (joinRes.success && joinRes.room) {
        // Immediately set users from join response
        const users = joinRes.room.users.map((u) => ({
          userId: u.id,
          userName: u.name,
          roomId,
          isOnline: true,
          lastSeen: Date.now(),
          isTyping: false,
          color: u.color,
        }));
        setOnlineUsersGlobal(users);

        // Wait for presence to establish
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Switch to users tab to show the icons
        setActiveTab("users");
      }
    } catch (error: unknown) {
      console.error("Failed to join room:", error);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoomId) return;

    try {
      await collaboration.leaveRoom(currentRoomId);
      setCurrentRoomId(null);
      localStorage.removeItem("collabRoomId");
      setOnlineUsersGlobal([]);
    } catch (error: unknown) {
      console.error("Failed to leave room:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentRoomId) return;

    try {
      await collaboration.sendMessage(messageInput.trim(), "text");
      setMessageInput("");
    } catch (error: unknown) {
      console.error("Failed to send message:", error);
    }
  };

  const handleShareRoom = async () => {
    if (!currentRoomId) return;

    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/room/${currentRoomId}`
        : "";

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentRoomId) return;
    try {
      await collaboration.editMessage(messageId, newContent);
    } catch (err) {
      console.error("Edit failed", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentRoomId) return;
    try {
      await collaboration.deleteMessage(messageId);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const panelBody = (
    <>
      {/* Header */}
      <div className="border-border-subtle bg-surface-1/70 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-primary text-lg font-semibold">Collaboration</h2>
          {!embedded && (
            <button
              onClick={onToggle}
              className="text-muted hover:bg-surface-1/60 hover:text-primary rounded-lg p-2 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* User Info */}
        {collaboration.user && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: collaboration.user.color }}
            >
              {collaboration.user.name[0]?.toUpperCase()}
            </div>
            <span className="text-primary/80 text-sm">
              {collaboration.user.name}
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
            { id: "users", label: "Users", icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "rooms" | "messages" | "users")}
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
          <MemoRoomsTab
            rooms={collaboration.rooms}
            currentRoomId={currentRoomId}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={handleLeaveRoom}
            onShareRoom={handleShareRoom}
            isCreating={collaboration.isCreatingRoom}
            isJoining={collaboration.isJoiningRoom}
            copied={copied}
          />
        )}

        {activeTab === "messages" && currentRoomId && (
          <MemoChatTab
            _roomId={currentRoomId}
            room={collaboration.rooms.find((r) => r.id === currentRoomId)}
            messages={collaboration.messages}
            messageInput={messageInput}
            onMessageInputChange={setMessageInput}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={collaboration.user}
            typingUsers={collaboration.typingUsers}
          />
        )}

        {activeTab === "messages" && !currentRoomId && (
          <div className="py-8 text-center">
            <MessageCircle size={48} className="mx-auto mb-4 text-slate-600" />
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

        {activeTab === "users" && (
          <MemoUsersTab
            _roomId={currentRoomId ?? ""}
            onlineUsers={collaboration.onlineUsers}
            typingUsers={collaboration.typingUsers}
          />
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex h-full flex-col">{panelBody}</div>;
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
          {panelBody}
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
        <div className="relative rounded-lg border border-green-600/30 bg-green-600/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-medium text-green-400">
                Connected to room
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onShareRoom}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-600/20 px-3 py-2 text-xs text-blue-400 transition-colors hover:bg-blue-600/30"
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
            <button
              onClick={onLeaveRoom}
              className="absolute top-1 right-2 text-[11px] font-medium text-red-400 hover:text-red-300"
              title="Leave room"
            >
              Leave
            </button>
          </div>
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
  room,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  currentUser,
  typingUsers,
}: {
  _roomId: string;
  room?: CollaborationRoom;
  messages: CollaborationMessage[];
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  currentUser: CollaborationUser | null;
  typingUsers: TypingIndicator[];
}) {
  const deferredMessages = useDeferredValue(messages);

  const MessagesList = memo(function MessagesListComponent({
    msgs,
  }: {
    msgs: CollaborationMessage[];
  }) {
    return (
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {msgs.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-500">Start the conversation!</p>
          </div>
        ) : (
          msgs.map((message) => {
            const sender = room?.users.find((u) => u.id === message.userId);
            const userColor = sender?.color ?? "#64748b"; // slate-500 fallback

            const isMe = message.userId === currentUser?.id;

            return (
              <div
                key={message.id}
                className={clsx(
                  "group relative max-w-[85%] rounded-lg p-3",
                  isMe ? "ml-auto" : "",
                )}
                style={
                  isMe
                    ? {
                        backgroundColor: "rgba(56, 189, 248, 0.15)",
                        color: "#bae6fd",
                      }
                    : {
                        backgroundColor: userColor + "1A",
                        color: "#e2e8f0",
                      }
                }
              >
                {(isMe || currentUser?.role === Role.MODERATOR) && (
                  <div className="absolute top-1 right-1 opacity-75 transition-opacity focus-within:opacity-100 hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted hover:text-primary focus:outline-none">
                          <MoreVertical size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28">
                        <DropdownMenuItem
                          onSelect={() => {
                            const newContent = window.prompt(
                              "Edit message",
                              message.content,
                            );
                            if (
                              newContent &&
                              newContent.trim() !== message.content
                            ) {
                              onEditMessage(message.id, newContent.trim());
                            }
                          }}
                        >
                          <Pencil size={12} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            if (window.confirm("Delete this message?")) {
                              onDeleteMessage(message.id);
                            }
                          }}
                        >
                          <Trash2 size={12} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: userColor }}
                  />
                  <span className="text-xs font-medium opacity-80">
                    {isMe
                      ? "You"
                      : (sender?.name ?? `User ${message.userId.slice(0, 8)}`)}
                  </span>
                  <span className="text-xs opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.updatedAt && (
                    <span className="ml-1 text-[10px] italic opacity-50">
                      (edited)
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            );
          })
        )}
      </div>
    );
  });

  return (
    <div className="flex h-full max-h-[calc(100vh-280px)] flex-col">
      <MessagesList msgs={deferredMessages} />

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
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.userName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="text-sm text-slate-300">
                  {user.userName ?? `User ${user.userId.slice(0, 8)}`}
                </span>
              </div>
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

const MemoRoomsTab = memo(RoomsTab);
const MemoChatTab = memo(ChatTab);
const MemoUsersTab = memo(UsersTab);
