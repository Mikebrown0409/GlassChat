import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { CollaborationMessage } from "~/lib/collaboration-v2/types";
import { triggerCollaborationEvent } from "~/lib/pusher/server";

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { roomId, message, userId } = (await request.json()) as {
      roomId: string;
      message: CollaborationMessage;
      userId: string;
    };

    if (!roomId || !message || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, message, userId" },
        { status: 400 },
      );
    }

    // Trigger Pusher event to all clients in the room
    await triggerCollaborationEvent(roomId, "message-sync", {
      ...message,
      userId,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending collaboration message:", error);
    return NextResponse.json(
      { error: "Failed to send collaboration message" },
      { status: 500 },
    );
  }
}
