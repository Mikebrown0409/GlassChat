// Stream Transformer for Block-Aware AI Streaming
// Wraps existing character-by-character streams with semantic block detection

import { BlockDetector } from "./blockDetector";
import type { AIStreamChunk } from "./types";
import { BlockType } from "./types";

export interface StreamTransformerConfig {
  enableBlockDetection?: boolean;
  bufferSize?: number; // How many characters to buffer before processing
  minBlockSize?: number; // Minimum characters before emitting a block
}

const DEFAULT_CONFIG: StreamTransformerConfig = {
  enableBlockDetection: true,
  bufferSize: 50, // Process in small chunks for responsiveness
  minBlockSize: 20, // Don't emit blocks too early
};

/**
 * Transform a character-by-character stream into block-aware chunks
 */
export async function* transformToBlockStream(
  originalStream: AsyncGenerator<AIStreamChunk>,
  config: StreamTransformerConfig = DEFAULT_CONFIG,
): AsyncGenerator<AIStreamChunk> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // If block detection is disabled, pass through original stream
  if (!finalConfig.enableBlockDetection) {
    yield* originalStream;
    return;
  }

  const detector = new BlockDetector();
  let contentBuffer = "";
  let lastEmittedContent = "";

  try {
    for await (const chunk of originalStream) {
      // ⚠️ CRITICAL FIX: Don't pass through raw chunks when in block mode!
      // This was causing the "flash" effect where content appeared before blocks

      // Skip block processing if no content
      if (!chunk.content) continue;

      contentBuffer += chunk.content;

      // Process blocks when we have enough content or stream is complete
      if (contentBuffer.length >= finalConfig.bufferSize! || chunk.isComplete) {
        const newContent = contentBuffer.slice(lastEmittedContent.length);
        if (newContent) {
          const result = detector.processChunk(newContent);

          // Emit block-aware chunks for each detected block
          for (const { block, blockId } of result.blocks) {
            if (
              block.content.length >= finalConfig.minBlockSize! ||
              chunk.isComplete
            ) {
              yield {
                content: block.content,
                isComplete: false,
                block,
                blockId,
                usage: chunk.usage,
              };
            }
          }

          lastEmittedContent = contentBuffer;
        }
      }

      // Handle completion
      if (chunk.isComplete) {
        const finalBlock = detector.finalize();
        if (finalBlock) {
          yield {
            content: finalBlock.block.content,
            isComplete: true,
            block: finalBlock.block,
            blockId: finalBlock.blockId,
            usage: chunk.usage,
          };
        }
        break;
      }
    }
  } finally {
    detector.reset();
  }
}

/**
 * Lightweight block detection for simpler use cases
 * Detects major block boundaries and streams blocks in real-time
 */
export async function* transformToSimpleBlocks(
  originalStream: AsyncGenerator<AIStreamChunk>,
): AsyncGenerator<AIStreamChunk> {
  let fullContent = "";
  let lastProcessedLength = 0;
  const blockBuffer: Array<{ content: string; type: string; id: string }> = [];

  const { detectSimpleBlocks } = await import("./blockDetector");

  try {
    for await (const chunk of originalStream) {
      fullContent += chunk.content;

      // Process blocks incrementally as content grows (very small threshold
      // for the very first chunk so that even the first character triggers
      // an update – this ensures the UI animates immediately for providers
      // like OpenAI that may send long newline-free streams.
      const THRESHOLD = lastProcessedLength === 0 ? 1 : 6;
      if (
        fullContent.length > lastProcessedLength + THRESHOLD ||
        chunk.isComplete
      ) {
        const currentBlocks = detectSimpleBlocks(fullContent);

        if (process.env.NODE_ENV === "development" && chunk.isComplete) {
          console.log(`[StreamTransformer] Final content analysis:`, {
            contentLength: fullContent.length,
            blocksDetected: currentBlocks.length,
            contentPreview: fullContent.slice(0, 200) + "...",
            blockTypes: currentBlocks.map((b) => b.type),
          });
        }

        // Emit new or updated blocks (only if content actually changed)
        for (let i = 0; i < currentBlocks.length; i++) {
          const block = currentBlocks[i]!;
          const blockId = `simple-block-${i}`;

          // Check if this is a new block or an updated existing block
          if (i >= blockBuffer.length) {
            // New block
            blockBuffer.push({
              content: block.content,
              type: block.type,
              id: blockId,
            });

            if (process.env.NODE_ENV === "development") {
              console.log(
                `[StreamTransformer] New block detected: ${blockId} (${block.type})`,
              );
            }

            yield {
              content: block.content,
              isComplete: false,
              block,
              blockId,
              usage: chunk.usage,
            };
          } else if (blockBuffer[i]!.content !== block.content) {
            // Updated existing block - only emit if content changed enough
            const contentDiff = Math.abs(
              blockBuffer[i]!.content.length - block.content.length,
            );

            // Emit updates whenever there is any additional content, but
            // avoid network spam by requiring at least 2 new characters.
            if (contentDiff > 2 || chunk.isComplete) {
              blockBuffer[i] = {
                content: block.content,
                type: block.type,
                id: blockId,
              };

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `[StreamTransformer] Updated block: ${blockId} (${block.type}, +${contentDiff} chars)`,
                );
              }

              yield {
                content: block.content,
                isComplete: false,
                block,
                blockId,
                usage: chunk.usage,
              };
            }
          }
        }

        lastProcessedLength = fullContent.length;
      }

      // Handle completion - emit final state for all blocks (avoid duplicates)
      if (chunk.isComplete) {
        const finalBlocks = detectSimpleBlocks(fullContent);

        // Only emit final blocks that need updates or completion marking
        for (let i = 0; i < finalBlocks.length; i++) {
          const block = finalBlocks[i]!;
          const blockId = `simple-block-${i}`;

          // Check if this block needs a final update
          const needsUpdate =
            !blockBuffer[i] || blockBuffer[i]!.content !== block.content;
          const isLastBlock = i === finalBlocks.length - 1;

          if (needsUpdate || isLastBlock) {
            yield {
              content: block.content,
              isComplete: isLastBlock,
              block,
              blockId,
              usage: chunk.usage,
            };
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error("[StreamTransformer] Error in simple blocks:", error);
    // Fallback: emit content as single block
    if (fullContent.trim()) {
      yield {
        content: fullContent,
        isComplete: true,
        block: { content: fullContent, type: BlockType.PARAGRAPH },
        blockId: "simple-block-0",
      };
    }
  }
}

/**
 * Factory function to create appropriate stream transformer
 */
export function createStreamTransformer(
  mode: "block" | "simple" | "passthrough" = "simple",
  config?: StreamTransformerConfig,
) {
  switch (mode) {
    case "block":
      return (stream: AsyncGenerator<AIStreamChunk>) =>
        transformToBlockStream(stream, config);

    case "simple":
      return (stream: AsyncGenerator<AIStreamChunk>) =>
        transformToSimpleBlocks(stream);

    case "passthrough":
    default:
      return (stream: AsyncGenerator<AIStreamChunk>) => stream;
  }
}
