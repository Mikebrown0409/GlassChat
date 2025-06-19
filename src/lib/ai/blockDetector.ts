// Block Detection Utility for Semantic Streaming
// Transforms character-by-character streams into block-aware semantic units

import { BlockType, type StreamBlock } from "./types";

interface BlockPattern {
  type: BlockType;
  startRegex: RegExp;
  endRegex?: RegExp;
  extractMetadata?: (match: RegExpMatchArray) => StreamBlock["metadata"];
}

// Patterns for detecting different block types
const BLOCK_PATTERNS: BlockPattern[] = [
  // Code blocks (```language or ```)
  {
    type: BlockType.CODE_BLOCK,
    startRegex: /^```(\w+)?\s*$/m,
    endRegex: /^```\s*$/m,
    extractMetadata: (match) => ({
      language: match[1] || "text",
      complete: false,
    }),
  },

  // Headers (# ## ### etc.)
  {
    type: BlockType.HEADER,
    startRegex: /^(#{1,6})\s+(.+)$/m,
    extractMetadata: (match) => ({
      level: match[1]?.length || 1,
      complete: true,
    }),
  },

  // Blockquotes (> text)
  {
    type: BlockType.BLOCKQUOTE,
    startRegex: /^>\s+/m,
  },

  // Ordered lists (1. 2. etc.)
  {
    type: BlockType.LIST,
    startRegex: /^\d+\.\s+/m,
    extractMetadata: () => ({
      ordered: true,
      complete: false,
    }),
  },

  // Unordered lists (- * +)
  {
    type: BlockType.LIST,
    startRegex: /^[-*+]\s+/m,
    extractMetadata: () => ({
      ordered: false,
      complete: false,
    }),
  },

  // Table detection (| header | header |)
  {
    type: BlockType.TABLE,
    startRegex: /^\|.*\|.*$/m,
  },
];

export class BlockDetector {
  private buffer = "";
  private currentBlock: StreamBlock | null = null;
  private blockId = 0;

  /**
   * Process a new chunk of content and detect semantic blocks
   */
  processChunk(newContent: string): {
    blocks: Array<{ block: StreamBlock; blockId: string }>;
    hasNewBlock: boolean;
  } {
    this.buffer += newContent;
    const blocks: Array<{ block: StreamBlock; blockId: string }> = [];
    let hasNewBlock = false;

    // Split buffer into lines for pattern matching
    const lines = this.buffer.split("\n");
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      // Check if we're starting a new block
      const detectedBlock = this.detectBlockType(line, nextLine);

      if (detectedBlock && !this.currentBlock) {
        // Starting a new block
        this.currentBlock = detectedBlock;
        this.blockId++;
        hasNewBlock = true;
        processedLines.push(line);
      } else if (
        detectedBlock &&
        this.currentBlock?.type !== detectedBlock.type
      ) {
        // Switching to a different block type
        // Finalize current block
        if (this.currentBlock) {
          this.currentBlock.content = processedLines.join("\n");
          this.currentBlock.metadata = {
            ...this.currentBlock.metadata,
            complete: true,
          };
          blocks.push({
            block: { ...this.currentBlock },
            blockId: `block-${this.blockId}`,
          });
        }

        // Start new block
        this.currentBlock = detectedBlock;
        this.blockId++;
        hasNewBlock = true;
        processedLines.length = 0;
        processedLines.push(line);
      } else {
        // Continue current block or treat as paragraph
        if (!this.currentBlock) {
          this.currentBlock = {
            type: BlockType.PARAGRAPH,
            content: "",
            metadata: { complete: false },
          };
          this.blockId++;
          hasNewBlock = true;
        }
        processedLines.push(line);
      }

      // Check for block end conditions
      if (this.currentBlock && this.isBlockComplete(line, this.currentBlock)) {
        this.currentBlock.content = processedLines.join("\n");
        this.currentBlock.metadata = {
          ...this.currentBlock.metadata,
          complete: true,
        };
        blocks.push({
          block: { ...this.currentBlock },
          blockId: `block-${this.blockId}`,
        });
        this.currentBlock = null;
        processedLines.length = 0;
      }
    }

    // Update buffer to remaining unprocessed content
    this.buffer = processedLines.join("\n");

    // If we have an active block that's being built, include it
    if (this.currentBlock && processedLines.length > 0) {
      this.currentBlock.content = processedLines.join("\n");
      blocks.push({
        block: { ...this.currentBlock },
        blockId: `block-${this.blockId}`,
      });
    }

    return { blocks, hasNewBlock };
  }

  /**
   * Finalize any remaining content in the buffer
   */
  finalize(): { block: StreamBlock; blockId: string } | null {
    if (this.buffer.trim() && this.currentBlock) {
      this.currentBlock.content = this.buffer;
      this.currentBlock.metadata = {
        ...this.currentBlock.metadata,
        complete: true,
      };
      const result = {
        block: { ...this.currentBlock },
        blockId: `block-${this.blockId}`,
      };
      this.reset();
      return result;
    }
    return null;
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.buffer = "";
    this.currentBlock = null;
    this.blockId = 0;
  }

  /**
   * Detect what type of block a line represents
   */
  private detectBlockType(line: string, nextLine?: string): StreamBlock | null {
    for (const pattern of BLOCK_PATTERNS) {
      const match = line.match(pattern.startRegex);
      if (match) {
        return {
          type: pattern.type,
          content: "",
          metadata: pattern.extractMetadata?.(match) || { complete: false },
        };
      }
    }

    return null;
  }

  /**
   * Check if a block is complete based on patterns
   */
  private isBlockComplete(line: string, block: StreamBlock): boolean {
    const pattern = BLOCK_PATTERNS.find((p) => p.type === block.type);

    // Check end regex if exists
    if (pattern?.endRegex) {
      return pattern.endRegex.test(line);
    }

    // Headers and single-line blocks are complete immediately
    if (block.type === BlockType.HEADER) {
      return true;
    }

    // Paragraphs end with double newlines (handled differently)
    if (block.type === BlockType.PARAGRAPH) {
      return line.trim() === "" && block.content.includes("\n\n");
    }

    return false;
  }
}

/**
 * Simple block detector for backward compatibility
 * Detects paragraph breaks and basic structures
 */
export function detectSimpleBlocks(content: string): StreamBlock[] {
  const blocks: StreamBlock[] = [];
  const paragraphs = content.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      const trimmed = paragraph.trim();

      // Headers (# ## ### etc.)
      if (/^#{1,6}\s+/.test(trimmed)) {
        blocks.push({
          type: BlockType.HEADER,
          content: paragraph,
          metadata: {
            level: trimmed.match(/^#+/)?.[0].length || 1,
            complete: true,
          },
        });
      }
      // Code blocks (```lang or just ```)
      else if (trimmed.startsWith("```")) {
        blocks.push({
          type: BlockType.CODE_BLOCK,
          content: paragraph,
          metadata: {
            language: trimmed.match(/^```(\w+)/)?.[1] || "text",
            complete: true,
          },
        });
      }
      // Unordered lists (- * +)
      else if (/^[-*+]\s+/.test(trimmed)) {
        blocks.push({
          type: BlockType.LIST,
          content: paragraph,
          metadata: {
            ordered: false,
            complete: true,
          },
        });
      }
      // Ordered lists (1. 2. etc.)
      else if (/^\d+\.\s+/.test(trimmed)) {
        blocks.push({
          type: BlockType.LIST,
          content: paragraph,
          metadata: {
            ordered: true,
            complete: true,
          },
        });
      }
      // Blockquotes (> text)
      else if (trimmed.startsWith("> ")) {
        blocks.push({
          type: BlockType.BLOCKQUOTE,
          content: paragraph,
          metadata: { complete: true },
        });
      }
      // Tables (| col | col |)
      else if (/^\|.*\|.*$/m.test(trimmed)) {
        blocks.push({
          type: BlockType.TABLE,
          content: paragraph,
          metadata: { complete: true },
        });
      }
      // Default to paragraph
      else {
        blocks.push({
          type: BlockType.PARAGRAPH,
          content: paragraph,
          metadata: { complete: true },
        });
      }
    }
  }

  return blocks;
}
