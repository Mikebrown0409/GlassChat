// Block-Aware Rendering Components
// Individual components for each semantic block type with typewriter animation

import React from "react";
import { type RenderedBlock } from "~/lib/ai/blockRenderer";
import { BlockType } from "~/lib/ai/types";
import MarkdownContent from "./MarkdownContent";
import { TypewriterContent } from "./TypewriterContent";

interface BlockComponentProps {
  renderedBlock: RenderedBlock;
  onAnimationComplete?: (blockId: string) => void;
  className?: string;
}

/**
 * Header Block Component (# ## ### etc.)
 */
export function HeaderBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;
  const level = block.metadata?.level ?? 1;

  if (isAnimating) {
    return (
      <div className={`block-header block-header-${level} ${className ?? ""}`}>
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div className={`block-header block-header-${level} ${className ?? ""}`}>
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * Code Block Component (```language)
 */
export function CodeBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;

  if (isAnimating) {
    return (
      <div className={`block-code-block font-mono ${className ?? ""}`}>
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div className={`block-code-block font-mono ${className ?? ""}`}>
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * List Block Component (- item or 1. item)
 */
export function ListBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;
  const isOrdered = block.metadata?.ordered ?? false;

  if (isAnimating) {
    return (
      <div
        className={`block-list ${isOrdered ? "block-list-ordered" : "block-list-unordered"} ${className ?? ""}`}
      >
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div
      className={`block-list ${isOrdered ? "block-list-ordered" : "block-list-unordered"} ${className ?? ""}`}
    >
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * Blockquote Component (> text)
 */
export function BlockquoteBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;

  if (isAnimating) {
    return (
      <div className={`block-blockquote ${className ?? ""}`}>
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div className={`block-blockquote ${className ?? ""}`}>
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * Table Block Component (| col | col |)
 */
export function TableBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;

  if (isAnimating) {
    return (
      <div className={`block-table ${className ?? ""}`}>
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div className={`block-table ${className ?? ""}`}>
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * Paragraph Block Component (default)
 */
export function ParagraphBlock({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block, isAnimating } = renderedBlock;

  if (isAnimating) {
    return (
      <div className={`block-paragraph ${className ?? ""}`}>
        <TypewriterContent
          content={block.content}
          role="assistant"
          isStreaming={true}
          onDone={() => onAnimationComplete?.(renderedBlock.id)}
        />
      </div>
    );
  }

  return (
    <div className={`block-paragraph ${className ?? ""}`}>
      <MarkdownContent content={block.content} role="assistant" />
    </div>
  );
}

/**
 * Generic Block Renderer - automatically selects the right component
 */
export function BlockRenderer({
  renderedBlock,
  onAnimationComplete,
  className,
}: BlockComponentProps) {
  const { block } = renderedBlock;

  switch (block.type) {
    case BlockType.HEADER:
      return (
        <HeaderBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );

    case BlockType.CODE_BLOCK:
      return (
        <CodeBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );

    case BlockType.LIST:
      return (
        <ListBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );

    case BlockType.BLOCKQUOTE:
      return (
        <BlockquoteBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );

    case BlockType.TABLE:
      return (
        <TableBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );

    case BlockType.PARAGRAPH:
    default:
      return (
        <ParagraphBlock
          renderedBlock={renderedBlock}
          onAnimationComplete={onAnimationComplete}
          className={className}
        />
      );
  }
}

/**
 * Block List Renderer - renders multiple blocks in sequence
 */
interface BlockListRendererProps {
  blocks: RenderedBlock[];
  onBlockAnimationComplete?: (blockId: string) => void;
  className?: string;
  blockClassName?: string;
}

export function BlockListRenderer({
  blocks,
  onBlockAnimationComplete,
  className,
  blockClassName,
}: BlockListRendererProps) {
  return (
    <div className={`block-list-renderer ${className ?? ""}`}>
      {blocks.map((renderedBlock, index) => (
        <div
          key={renderedBlock.id}
          className={`block-container ${blockClassName ?? ""}`}
          data-block-type={renderedBlock.block.type}
          data-block-id={renderedBlock.id}
          data-block-index={index}
        >
          <BlockRenderer
            renderedBlock={renderedBlock}
            onAnimationComplete={onBlockAnimationComplete}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for block-specific styling and behavior
 */
export function useBlockStyling(blockType: BlockType) {
  const getBlockClasses = React.useCallback(
    (isAnimating: boolean, isComplete: boolean) => {
      const baseClasses = [
        "block-content",
        `block-type-${blockType.toLowerCase()}`,
        isAnimating && "block-animating",
        isComplete && "block-complete",
        !isComplete && "block-incomplete",
      ]
        .filter(Boolean)
        .join(" ");

      return baseClasses;
    },
    [blockType],
  );

  const getAnimationConfig = React.useCallback(() => {
    // Different animation speeds for different block types
    switch (blockType) {
      case BlockType.HEADER:
        return { speed: 1.2, pauseAfter: 200 }; // Slightly faster for headers

      case BlockType.CODE_BLOCK:
        return { speed: 0.8, pauseAfter: 300 }; // Slower for code readability

      case BlockType.LIST:
        return { speed: 1.0, pauseAfter: 150 }; // Standard speed

      case BlockType.BLOCKQUOTE:
        return { speed: 0.9, pauseAfter: 250 }; // Slightly slower for emphasis

      case BlockType.TABLE:
        return { speed: 0.7, pauseAfter: 400 }; // Slowest for table structure

      case BlockType.PARAGRAPH:
      default:
        return { speed: 1.0, pauseAfter: 100 }; // Standard speed
    }
  }, [blockType]);

  return {
    getBlockClasses,
    getAnimationConfig,
  };
}
