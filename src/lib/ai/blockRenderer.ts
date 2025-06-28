// Client-side Block Rendering System
// Manages block-aware streaming display and animation coordination

import React from "react";
import { BlockType, type StreamBlock } from "./types";

export interface RenderedBlock {
  id: string;
  block: StreamBlock;
  isAnimating: boolean;
  isComplete: boolean;
  displayContent: string; // Current animated content
  timestamp: number;
}

export interface BlockStreamState {
  blocks: RenderedBlock[];
  activeBlockId: string | null;
  isStreaming: boolean;
  totalContentLength: number;
}

export class BlockStreamManager {
  private state: BlockStreamState = {
    blocks: [],
    activeBlockId: null,
    isStreaming: false,
    totalContentLength: 0,
  };

  private listeners: Array<(state: BlockStreamState) => void> = [];
  private animationFrameId: number | null = null;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BlockStreamState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current state
   */
  getState(): BlockStreamState {
    return { ...this.state };
  }

  /**
   * Start streaming mode
   */
  startStreaming(): void {
    this.state.isStreaming = true;
    this.notifyListeners();
  }

  /**
   * Process a new stream chunk with optional block metadata
   */
  processChunk(content: string, block?: StreamBlock, blockId?: string): void {
    if (block && blockId) {
      this.processBlockChunk(content, block, blockId);
    } else {
      this.processLegacyChunk(content);
    }
  }

  /**
   * Process block-aware chunk
   */
  private processBlockChunk(
    content: string,
    block: StreamBlock,
    blockId: string,
  ): void {
    const existingBlockIndex = this.state.blocks.findIndex(
      (b) => b.id === blockId,
    );

    if (existingBlockIndex >= 0) {
      // Update existing block
      const existingBlock = this.state.blocks[existingBlockIndex]!;
      existingBlock.block = { ...block };
      existingBlock.isComplete = block.metadata?.complete ?? false;
      existingBlock.timestamp = Date.now();

      // If this block is currently animating, update its target content
      if (existingBlock.isAnimating) {
        // The typewriter will handle the content update
        this.state.activeBlockId = blockId;
      }
    } else {
      // Create new block
      const newBlock: RenderedBlock = {
        id: blockId,
        block: { ...block },
        isAnimating: true,
        isComplete: block.metadata?.complete ?? false,
        displayContent: "",
        timestamp: Date.now(),
      };

      this.state.blocks.push(newBlock);
      this.state.activeBlockId = blockId;
    }

    this.state.totalContentLength += content.length;
    this.notifyListeners();
  }

  /**
   * Process legacy character-by-character chunk
   */
  private processLegacyChunk(content: string): void {
    // For backward compatibility, treat as a single paragraph block
    const blockId = "legacy-paragraph";
    const existingBlockIndex = this.state.blocks.findIndex(
      (b) => b.id === blockId,
    );

    if (existingBlockIndex >= 0) {
      // Update existing legacy block
      const existingBlock = this.state.blocks[existingBlockIndex]!;
      existingBlock.block.content += content;
      existingBlock.timestamp = Date.now();
    } else {
      // Create new legacy block
      const newBlock: RenderedBlock = {
        id: blockId,
        block: {
          type: BlockType.PARAGRAPH,
          content,
          metadata: { complete: false },
        },
        isAnimating: true,
        isComplete: false,
        displayContent: "",
        timestamp: Date.now(),
      };

      this.state.blocks.push(newBlock);
    }

    this.state.activeBlockId = blockId;
    this.state.totalContentLength += content.length;
    this.notifyListeners();
  }

  /**
   * Mark streaming as complete
   */
  completeStreaming(): void {
    this.state.isStreaming = false;

    // Mark all blocks as complete
    this.state.blocks.forEach((block) => {
      block.isComplete = true;
      block.block.metadata = { ...block.block.metadata, complete: true };
    });

    this.notifyListeners();
  }

  /**
   * Update block animation state
   */
  updateBlockAnimation(
    blockId: string,
    displayContent: string,
    isAnimating: boolean,
  ): void {
    const block = this.state.blocks.find((b) => b.id === blockId);
    if (block) {
      block.displayContent = displayContent;
      block.isAnimating = isAnimating;

      // If this block finished animating and streaming is done, check if all blocks are done
      if (!isAnimating && !this.state.isStreaming) {
        const allBlocksDone = this.state.blocks.every((b) => !b.isAnimating);
        if (allBlocksDone) {
          this.state.activeBlockId = null;
        }
      }

      this.notifyListeners();
    }
  }

  /**
   * Get block by ID
   */
  getBlock(blockId: string): RenderedBlock | undefined {
    return this.state.blocks.find((b) => b.id === blockId);
  }

  /**
   * Get active (currently animating) block
   */
  getActiveBlock(): RenderedBlock | undefined {
    if (!this.state.activeBlockId) return undefined;
    return this.getBlock(this.state.activeBlockId);
  }

  /**
   * Reset the manager state
   */
  reset(): void {
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        clearTimeout(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    this.state = {
      blocks: [],
      activeBlockId: null,
      isStreaming: false,
      totalContentLength: 0,
    };

    this.notifyListeners();
  }

  /**
   * Get content for a specific block type optimized for display
   */
  getOptimizedContent(block: RenderedBlock): string {
    const { type, content } = block.block;

    switch (type) {
      case BlockType.CODE_BLOCK:
        // Ensure proper code block formatting
        if (!content.startsWith("```")) {
          const language = block.block.metadata?.language ?? "text";
          return `\`\`\`${language}\n${content}\n\`\`\``;
        }
        return content;

      case BlockType.HEADER:
        // Ensure proper header formatting
        const level = block.block.metadata?.level ?? 1;
        const headerPrefix = "#".repeat(level);
        if (!content.startsWith("#")) {
          return `${headerPrefix} ${content}`;
        }
        return content;

      case BlockType.LIST:
        // Ensure proper list formatting
        const isOrdered = block.block.metadata?.ordered ?? false;
        const lines = content.split("\n");
        return lines
          .map((line, index) => {
            if (line.trim() && !/^[-*+\d]/.exec(line)) {
              return isOrdered ? `${index + 1}. ${line}` : `- ${line}`;
            }
            return line;
          })
          .join("\n");

      case BlockType.BLOCKQUOTE:
        // Ensure proper blockquote formatting
        if (!content.startsWith("> ")) {
          return `> ${content}`;
        }
        return content;

      default:
        return content;
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    // Use requestAnimationFrame to batch updates (with fallback for Node.js)
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        clearTimeout(this.animationFrameId);
      }
    }

    const scheduleUpdate = () => {
      const currentState = this.getState();
      this.listeners.forEach((listener) => {
        try {
          listener(currentState);
        } catch (error) {
          console.error("Block stream listener error:", error);
        }
      });
      this.animationFrameId = null;
    };

    if (typeof requestAnimationFrame !== "undefined") {
      this.animationFrameId = requestAnimationFrame(scheduleUpdate);
    } else {
      // Fallback for Node.js environment
      this.animationFrameId = setTimeout(
        scheduleUpdate,
        0,
      ) as unknown as number;
    }
  }
}

// Singleton instance for global use
export const blockStreamManager = new BlockStreamManager();

/**
 * React hook for consuming block stream state
 */
export function useBlockStream() {
  const [state, setState] = React.useState<BlockStreamState>(
    blockStreamManager.getState(),
  );

  React.useEffect(() => {
    const unsubscribe = blockStreamManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    processChunk: blockStreamManager.processChunk.bind(blockStreamManager),
    startStreaming: blockStreamManager.startStreaming.bind(blockStreamManager),
    completeStreaming:
      blockStreamManager.completeStreaming.bind(blockStreamManager),
    updateBlockAnimation:
      blockStreamManager.updateBlockAnimation.bind(blockStreamManager),
    getBlock: blockStreamManager.getBlock.bind(blockStreamManager),
    getActiveBlock: blockStreamManager.getActiveBlock.bind(blockStreamManager),
    reset: blockStreamManager.reset.bind(blockStreamManager),
    getOptimizedContent:
      blockStreamManager.getOptimizedContent.bind(blockStreamManager),
  };
}
