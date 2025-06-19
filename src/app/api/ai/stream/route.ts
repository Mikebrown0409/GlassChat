import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIStream } from "~/lib/ai/models";
import { createStreamTransformer } from "~/lib/ai/streamTransformer";
import { AIModel, type AIMessage } from "~/lib/ai/types";

const streamRequestSchema = z.object({
  model: z.nativeEnum(AIModel),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  // Block-aware streaming options (Phase 1)
  blockAware: z.boolean().optional().default(false),
  streamMode: z
    .enum(["passthrough", "simple", "block"])
    .optional()
    .default("passthrough"),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const { model, messages, blockAware, streamMode } =
      streamRequestSchema.parse(body);

    // Create the base stream
    const baseStream = await generateAIStream(model, messages as AIMessage[]);

    // Apply stream transformation based on configuration
    const transformMode = blockAware ? streamMode || "simple" : "passthrough";
    const streamTransformer = createStreamTransformer(transformMode);
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

            // Format as Server-Sent Events with block metadata
            const data = JSON.stringify({
              content: chunk.content,
              isComplete: chunk.isComplete,
              // Include block metadata if available (Phase 1)
              ...(chunk.block && {
                block: chunk.block,
                blockId: chunk.blockId,
              }),
            });

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
