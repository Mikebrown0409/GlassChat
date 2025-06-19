import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIStream } from "~/lib/ai/models";
import { AIModel, type AIMessage } from "~/lib/ai/types";

const streamRequestSchema = z.object({
  model: z.nativeEnum(AIModel),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { model, messages } = streamRequestSchema.parse(body);

    // Create the stream
    const stream = await generateAIStream(model, messages as AIMessage[]);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Format as Server-Sent Events
            const data = JSON.stringify({
              content: chunk.content,
              isComplete: chunk.isComplete,
            });

            const sseData = `data: ${data}\n\n`;
            controller.enqueue(encoder.encode(sseData));

            if (chunk.isComplete) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Stream setup error:", error);
    return NextResponse.json(
      { error: "Failed to initialize stream" },
      { status: 500 },
    );
  }
}
