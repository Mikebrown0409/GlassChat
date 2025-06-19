import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { triggerCollaborationEvent } from "~/lib/pusher/server";

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId } = (await request.json()) as {
      roomId: string;
      userId: string;
    };

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, userId" },
        { status: 400 },
      );
    }

    // Notify other users that someone joined
    await triggerCollaborationEvent(roomId, "user-joined", {
      userId,
      timestamp: Date.now(),
    });

    // You could also update room state in database here if needed
    // await updateRoomParticipants(roomId, userId, 'joined');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining collaboration room:", error);
    return NextResponse.json(
      { error: "Failed to join collaboration room" },
      { status: 500 },
    );
  }
}
