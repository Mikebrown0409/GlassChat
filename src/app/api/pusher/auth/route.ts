import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "~/lib/pusher/server";
import { getServerAuthSession } from "~/server/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pusherServer = getPusherServer();
    if (!pusherServer) {
      return NextResponse.json(
        { error: "Pusher not configured" },
        { status: 503 },
      );
    }

    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 },
      );
    }

    // Validate that user can access this channel
    // For now, we'll allow access to any room-* channel for authenticated users
    // You can add more specific authorization logic here
    if (!channelName.startsWith("room-") && !channelName.startsWith("chat-")) {
      return NextResponse.json(
        { error: "Unauthorized channel" },
        { status: 403 },
      );
    }

    // Create user data to pass to the channel
    const userData = {
      id: session.user.id,
      name: session.user.name || "Anonymous",
      image: session.user.image,
    };

    const authResponse = pusherServer.authorizeChannel(
      socketId,
      channelName,
      userData,
    );

    console.log(
      `✅ [Pusher] Authorized user ${session.user.id} for channel: ${channelName}`,
    );

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("❌ [Pusher] Auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
