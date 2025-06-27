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
      language: match[1] ?? "text",
      complete: false,
    }),
  },

  // Headers (# ## ### etc.)
  {
    type: BlockType.HEADER,
    startRegex: /^(#{1,6})\s+(.+)$/m,
    extractMetadata: (match) => ({
      level: match[1]?.length ?? 1,
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
      if (!line) continue; // Skip undefined lines

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
  private detectBlockType(
    line: string,
    _nextLine?: string,
  ): StreamBlock | null {
    for (const pattern of BLOCK_PATTERNS) {
      const match = line.match(pattern.startRegex);
      if (match) {
        return {
          type: pattern.type,
          content: "",
          metadata: pattern.extractMetadata?.(match) ?? { complete: false },
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
 * Detects paragraph breaks and basic structures with improved handling for AI-generated content
 */
export function detectSimpleBlocks(content: string): StreamBlock[] {
  const blocks: StreamBlock[] = [];

  // Pre-process content to handle common AI markdown issues
  const processedContent = preprocessContent(content);

  // Split by clear paragraph boundaries but be more flexible
  // Also handle single line breaks that separate different content types
  const sections = processedContent.split(
    /\n\s*\n|\n(?=#{1,6}\s)|\n(?=\d+\.\s)|\n(?=[-*+]\s)/,
  );

  for (const section of sections) {
    if (!section.trim()) continue;

    // Process each section for mixed content
    const sectionBlocksRaw = processSectionIntoBlocks(section.trim());

    // Post-process: split very long paragraphs for smoother streaming
    const sectionBlocks: StreamBlock[] = [];
    for (const blk of sectionBlocksRaw) {
      if (blk.type === BlockType.PARAGRAPH && blk.content.length > 500) {
        // Split at sentence boundaries
        const sentences = blk.content.split(/(?<=[.!?])\s+/);
        let buffer = "";
        for (const s of sentences) {
          if ((buffer + " " + s).trim().length > 500) {
            sectionBlocks.push({
              type: BlockType.PARAGRAPH,
              content: buffer.trim(),
              metadata: blk.metadata,
            });
            buffer = s;
          } else {
            buffer += (buffer ? " " : "") + s;
          }
        }
        if (buffer.trim()) {
          sectionBlocks.push({
            type: BlockType.PARAGRAPH,
            content: buffer.trim(),
            metadata: blk.metadata,
          });
        }
      } else {
        sectionBlocks.push(blk);
      }
    }

    blocks.push(...sectionBlocks);
  }

  // If no blocks were detected (edge case), treat as single paragraph
  if (blocks.length === 0 && content.trim()) {
    blocks.push({
      type: BlockType.PARAGRAPH,
      content: content.trim(),
      metadata: { complete: true },
    });
  }

  return blocks;
}

/**
 * Preprocess content to normalize common AI markdown patterns
 */
function preprocessContent(content: string): string {
  let processed = content;

  // Fix headers that might be embedded in text (e.g., "text***### Header***text")
  processed = processed.replace(
    /\*{2,}(#{1,6}\s+[^*\n]+)\*{2,}/g,
    "\n\n$1\n\n",
  );

  // Do not strip bold markers—preserve original markdown for accurate rendering

  // Add line breaks before lists that aren't at line start
  processed = processed.replace(/([.!?])\s*([*-]\s+)/g, "$1\n\n$2");

  // Add line breaks before headers that aren't at line start
  processed = processed.replace(/([.!?])\s*(#{1,6}\s+)/g, "$1\n\n$2");

  // Normalize spacing around headers
  processed = processed.replace(/(#{1,6}\s+[^\n]+)/g, "\n\n$1\n\n");

  // SPECIFIC FIX: Handle the user's exact case - "for?*   A different" pattern
  processed = processed.replace(/([?!.])\s*\*\s{2,}(\w+)/g, "$1\n\n* $2");

  // Handle "for:*   " pattern (alternative format)
  processed = processed.replace(/([?!.:])(?:\s*)(\*\s{2,})/g, "$1\n\n$2");

  // Fix ordered lists that appear mid-line
  processed = processed.replace(/([.!?])\s*(\d+\.\s+)/g, "$1\n\n$2");

  return processed;
}

/**
 * Process a section that may contain mixed block types
 */
function processSectionIntoBlocks(section: string): StreamBlock[] {
  const blocks: StreamBlock[] = [];
  const lines = section.split("\n");

  let currentBlock: {
    type: BlockType;
    lines: string[];
    metadata?: Record<string, unknown>;
  } | null = null;
  let inCodeBlock = false;
  let codeBlockDelimiter = "";

  const finishCurrentBlock = () => {
    if (currentBlock && currentBlock.lines.length > 0) {
      const content = currentBlock.lines.join("\n").trim();
      if (content) {
        blocks.push({
          type: currentBlock.type,
          content,
          metadata: currentBlock.metadata ?? { complete: true },
        });
      }
    }
    currentBlock = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Handle code block boundaries
    if (
      !inCodeBlock &&
      (trimmed.startsWith("```") || trimmed.startsWith("~~~"))
    ) {
      finishCurrentBlock();
      inCodeBlock = true;
      codeBlockDelimiter = trimmed.startsWith("```") ? "```" : "~~~";
      const language = trimmed.slice(3).trim() || "text";
      currentBlock = {
        type: BlockType.CODE_BLOCK,
        lines: [line],
        metadata: { language, complete: false },
      };
      continue;
    }

    if (inCodeBlock) {
      currentBlock?.lines.push(line);
      if (trimmed === codeBlockDelimiter) {
        inCodeBlock = false;
        codeBlockDelimiter = "";
        if (currentBlock) {
          currentBlock.metadata = { ...currentBlock.metadata, complete: true };
        }
        finishCurrentBlock();
      } else if (i === lines.length - 1) {
        // End of content while in code block - close it
        inCodeBlock = false;
        codeBlockDelimiter = "";
        if (currentBlock) {
          currentBlock.metadata = { ...currentBlock.metadata, complete: true };
        }
        finishCurrentBlock();
      }
      continue;
    }

    // Skip empty lines but finish current block
    if (!trimmed) {
      if (currentBlock) {
        finishCurrentBlock();
      }
      continue;
    }

    // Skip very short lines that are likely fragments (unless they're meaningful)
    if (trimmed.length < 3 && !/^[#*-]\s*$|^\d+\.\s*$/.exec(trimmed)) {
      // Append short fragments to current block instead of creating new ones
      if (currentBlock) {
        currentBlock.lines.push(line);
      }
      continue;
    }

    // Detect block type for this line
    const detectedType = detectLineBlockType(trimmed);
    const shouldStartNewBlock =
      !currentBlock ||
      currentBlock.type !== detectedType ||
      detectedType === BlockType.HEADER; // Always start new block for headers

    if (shouldStartNewBlock) {
      finishCurrentBlock();

      // Special handling for headers
      if (detectedType === BlockType.HEADER) {
        const level = (/^#+/.exec(trimmed) ?? [""])[0].length;
        currentBlock = {
          type: BlockType.HEADER,
          lines: [line],
          metadata: { level, complete: true },
        };
        finishCurrentBlock(); // Headers are always single-line blocks
        continue;
      }

      // Special handling for blockquotes, lists
      const metadata = getBlockMetadata(detectedType, trimmed);
      currentBlock = {
        type: detectedType,
        lines: [line],
        metadata,
      };
    } else {
      // Continue current block
      currentBlock?.lines.push(line);
    }
  }

  // Finish the last block
  finishCurrentBlock();

  return blocks;
}

/**
 * Detect the block type of a single line
 */
function detectLineBlockType(line: string): BlockType {
  const trimmed = line.trim();

  // Headers (must be at start of line)
  if (/^#{1,6}\s+/.test(trimmed)) {
    return BlockType.HEADER;
  }

  // Unordered lists
  if (/^[-*+]\s+/.test(trimmed)) {
    return BlockType.LIST;
  }

  // Ordered lists
  if (/^\d+\.\s+/.test(trimmed)) {
    return BlockType.LIST;
  }

  // Blockquotes
  if (/^>\s+/.test(trimmed)) {
    return BlockType.BLOCKQUOTE;
  }

  // Tables (pipe-separated)
  if (/^\|.*\|.*$/.test(trimmed)) {
    return BlockType.TABLE;
  }

  // Default to paragraph
  return BlockType.PARAGRAPH;
}

/**
 * Get metadata for a block type
 */
function getBlockMetadata(
  type: BlockType,
  line: string,
): Record<string, unknown> {
  switch (type) {
    case BlockType.HEADER:
      return {
        level: (/^#+/.exec(line) ?? [""])[0].length,
        complete: true,
      };
    case BlockType.LIST:
      return {
        ordered: /^\d+\./.test(line.trim()),
        complete: false,
      };
    case BlockType.CODE_BLOCK:
      const language = (/^```(\w+)/.exec(line) ?? ["", "text"])[1];
      return {
        language,
        complete: false,
      };
    default:
      return { complete: true };
  }
}
