import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIStream } from "~/lib/ai/models";
import { createStreamTransformer } from "~/lib/ai/streamTransformer";
import { AIModel, type AIMessage, type AIStreamChunk } from "~/lib/ai/types";

const streamRequestSchema = z.object({
  model: z.nativeEnum(AIModel),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  // Keep these for backward-compat but they no longer affect behavior
  blockAware: z.boolean().optional().default(false),
  streamMode: z.string().optional().default("passthrough"),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { model, messages } = streamRequestSchema.parse(body);

    if (process.env.NODE_ENV === "development") {
      console.log("[API] Unified stream request received:", {
        messageCount: messages.length,
      });
    }

    // Always use passthrough transformer for real-time responsiveness.
    const baseStream = await generateAIStream(model, messages as AIMessage[]);
    const streamTransformer = createStreamTransformer("passthrough");
    const stream = streamTransformer(baseStream);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        };

        try {
          for await (const chunk of stream) {
            if (isClosed) break;

            // Include block metadata only when present to minimize payload size
            const payload: Partial<AIStreamChunk> = {
              content: chunk.content,
              isComplete: chunk.isComplete,
            };

            if (chunk.blockId) {
              payload.blockId = chunk.blockId;
              payload.block = chunk.block;
            }

            const data = JSON.stringify(payload);

            const sseData = `data: ${data}\n\n`;
            controller.enqueue(encoder.encode(sseData));

            if (chunk.isComplete) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              safeClose();
              return;
            }
          }

          // If we exit the loop without isComplete, close the stream
          safeClose();
        } catch (error) {
          console.error("Streaming error:", error);
          if (!isClosed) {
            const errorData = JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            safeClose();
          }
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
