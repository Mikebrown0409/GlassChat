// Stream Transformer for Block-Aware AI Streaming
// Wraps existing character-by-character streams with semantic block detection

import { BlockDetector } from "./blockDetector";
import type { AIStreamChunk } from "./types";

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
      // Always pass through the raw character stream for backward compatibility
      yield chunk;

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
 * Detects major block boundaries without complex state management
 */
export async function* transformToSimpleBlocks(
  originalStream: AsyncGenerator<AIStreamChunk>,
): AsyncGenerator<AIStreamChunk> {
  let fullContent = "";
  let streamComplete = false;

  // First, pass through all original chunks
  for await (const chunk of originalStream) {
    yield chunk; // Maintain backward compatibility
    fullContent += chunk.content;

    if (chunk.isComplete) {
      streamComplete = true;
      break;
    }
  }

  // After stream completes, emit block-aware version
  if (streamComplete && fullContent.trim()) {
    const { detectSimpleBlocks } = await import("./blockDetector");
    const blocks = detectSimpleBlocks(fullContent);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      yield {
        content: block!.content,
        isComplete: i === blocks.length - 1,
        block,
        blockId: `simple-block-${i}`,
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
