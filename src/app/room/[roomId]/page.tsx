"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCollaboration } from "~/lib/collaboration/hooks";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const roomId = params?.roomId as string;
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collaboration = useCollaboration(roomId);

  const handleJoinRoom = useCallback(async () => {
    if (!roomId) return;

    setIsJoining(true);
    setError(null);

    try {
      // Ensure we have a collaboration user
      if (!collaboration.user) {
        console.log("🆕 Creating collaboration user for room join");
        // Get user name from session or use a default
        const userName =
          session?.user?.name ?? session?.user?.email ?? `User-${Date.now()}`;

        const createResult = await collaboration.createUser(userName);
        if (!createResult.success) {
          throw new Error(
            "error" in createResult
              ? createResult.error
              : "Failed to create user",
          );
        }
        console.log("✅ User created for room join");
      }

      console.log("🚪 Joining room:", roomId);
      // Join the room
      const result = await collaboration.joinRoom(roomId);

      if (result.success && result.room) {
      // Show a message if this was a placeholder room
        if (result.room.name === "Shared Room") {
          console.log("📝 Created a new shared room for collaboration");
      }

        console.log("✅ Room joined successfully, redirecting to chat");
      // Redirect to main chat interface with room joined
      router.push(`/?room=${roomId}`);
      } else {
        throw new Error(
          "error" in result ? result.error : "Failed to join room",
        );
      }
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Room not found")) {
        setError(
          "This room may have expired or doesn't exist. The room creator may need to create a new room and share a fresh link.",
        );
      } else {
        setError(
          `Failed to join room: ${errorMessage}. Please try again or contact the room creator.`,
        );
      }
    } finally {
      setIsJoining(false);
    }
  }, [
    roomId,
    collaboration,
    session?.user?.name,
    session?.user?.email,
    router,
  ]);

  useEffect(() => {
    if (status === "loading") return; // Still loading session

    if (status === "unauthenticated") {
      // Redirect to login with return URL
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.href)}`,
      );
      return;
    }

    if (status === "authenticated" && roomId && !isJoining) {
      void handleJoinRoom();
    }
  }, [status, roomId, isJoining, handleJoinRoom, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
          <p className="text-white">Joining collaboration room...</p>
          <p className="mt-2 text-sm text-zinc-400">Room ID: {roomId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md text-center">
          <div className="mb-4 text-red-500">
            <svg
              className="mx-auto h-16 w-16"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">
            Unable to Join Room
          </h1>
          <p className="mb-4 text-zinc-400">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Main Chat
          </button>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <p className="text-white">Preparing collaboration...</p>
      </div>
    </div>
  );
}
