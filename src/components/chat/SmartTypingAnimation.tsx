"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface SmartTypingAnimationProps {
  content: string;
  speed?: number;
  delayBeforeStart?: number;
  blockRevealMode?: "instant" | "typed" | "delayed";
  onComplete?: () => void;
  onInterrupt?: () => void;
  allowInterrupt?: boolean;
  className?: string;
}

interface ContentBlock {
  type: "text" | "code" | "table" | "heading" | "list";
  content: string;
  startIndex: number;
  endIndex: number;
}

interface SmartTypingState {
  displayedContent: string;
  isTyping: boolean;
  isComplete: boolean;
  currentBlockIndex: number;
  currentCharInBlock: number;
  blocks: ContentBlock[];
}

export function SmartTypingAnimation({
  content,
  speed = 60,
  delayBeforeStart = 500,
  blockRevealMode = "delayed",
  onComplete,
  onInterrupt,
  allowInterrupt = true,
  className = "",
}: SmartTypingAnimationProps) {
  const [state, setState] = useState<SmartTypingState>({
    displayedContent: "",
    isTyping: false,
    isComplete: false,
    currentBlockIndex: 0,
    currentCharInBlock: 0,
    blocks: [],
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInterruptedRef = useRef(false);

  // Parse content into blocks
  const parseContentIntoBlocks = useCallback((text: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentIndex = 0;

    // Regex patterns for different block types
    const patterns = [
      { type: "code" as const, regex: /```[\s\S]*?```/g },
      { type: "table" as const, regex: /\|.*\|[\s\S]*?\n(?!\|)/g },
      { type: "heading" as const, regex: /^#{1,6}\s+.*$/gm },
      { type: "list" as const, regex: /^(\s*[-*+]\s+.*\n?)+/gm },
    ];

    // Find all special blocks
    const specialBlocks: Array<{
      type: ContentBlock["type"];
      start: number;
      end: number;
      content: string;
    }> = [];

    patterns.forEach(({ type, regex }) => {
      let match;
      regex.lastIndex = 0; // Reset regex state
      while ((match = regex.exec(text)) !== null) {
        specialBlocks.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          content: match[0],
        });
      }
    });

    // Sort blocks by start position
    specialBlocks.sort((a, b) => a.start - b.start);

    // Create text blocks between special blocks
    specialBlocks.forEach((block, _index) => {
      // Add text block before this special block
      if (currentIndex < block.start) {
        const textContent = text.slice(currentIndex, block.start);
        if (textContent.trim()) {
          blocks.push({
            type: "text",
            content: textContent,
            startIndex: currentIndex,
            endIndex: block.start,
          });
        }
      }

      // Add the special block
      blocks.push({
        type: block.type,
        content: block.content,
        startIndex: block.start,
        endIndex: block.end,
      });

      currentIndex = block.end;
    });

    // Add remaining text as a text block
    if (currentIndex < text.length) {
      const textContent = text.slice(currentIndex);
      if (textContent.trim()) {
        blocks.push({
          type: "text",
          content: textContent,
          startIndex: currentIndex,
          endIndex: text.length,
        });
      }
    }

    // If no special blocks found, treat entire content as text
    if (blocks.length === 0) {
      blocks.push({
        type: "text",
        content: text,
        startIndex: 0,
        endIndex: text.length,
      });
    }

    return blocks;
  }, []);

  // Initialize blocks
  useEffect(() => {
    const blocks = parseContentIntoBlocks(content);
    setState((prev) => ({ ...prev, blocks }));
  }, [content, parseContentIntoBlocks]);

  // Natural pause calculation
  const getPauseAfterChar = useCallback(
    (char: string, _nextChar?: string) => {
      const baseDelay = 1000 / speed;

      if (char === "." || char === "!" || char === "?") {
        return Math.random() * 300 + 400;
      }
      if (char === "," || char === ":" || char === ";") {
        return Math.random() * 150 + 200;
      }
      if (char === "\n") {
        return Math.random() * 100 + 150;
      }
      return baseDelay + (Math.random() * 20 - 10);
    },
    [speed],
  );

  // Process next character or block
  const processNext = useCallback(() => {
    if (isInterruptedRef.current) return;

    setState((prevState) => {
      const { blocks, currentBlockIndex, currentCharInBlock } = prevState;

      if (currentBlockIndex >= blocks.length) {
        return {
          ...prevState,
          isTyping: false,
          isComplete: true,
        };
      }

      const currentBlock = blocks[currentBlockIndex];
      if (!currentBlock) return prevState;

      let newDisplayedContent = "";
      let nextBlockIndex = currentBlockIndex;
      let nextCharInBlock = currentCharInBlock;

      // Build content up to current position
      for (let i = 0; i < currentBlockIndex; i++) {
        newDisplayedContent += blocks[i]?.content ?? "";
      }

      // Handle current block based on type and mode
      if (currentBlock.type === "text" || blockRevealMode === "typed") {
        // Character-by-character typing
        if (currentCharInBlock < currentBlock.content.length) {
          newDisplayedContent += currentBlock.content.slice(
            0,
            currentCharInBlock + 1,
          );
          nextCharInBlock++;

          // Schedule next character
          const currentChar = currentBlock.content[currentCharInBlock];
          const nextChar = currentBlock.content[currentCharInBlock + 1];
          const delay = getPauseAfterChar(currentChar!, nextChar);
          timeoutRef.current = setTimeout(processNext, delay);
        } else {
          // Move to next block
          newDisplayedContent += currentBlock.content;
          nextBlockIndex++;
          nextCharInBlock = 0;

          // Delay before next block
          const delay = currentBlock.type === "text" ? 200 : 600;
          timeoutRef.current = setTimeout(processNext, delay);
        }
      } else {
        // Block reveal mode (instant or delayed)
        newDisplayedContent += currentBlock.content;
        nextBlockIndex++;
        nextCharInBlock = 0;

        // Delay for block reveal
        const delay = blockRevealMode === "instant" ? 100 : 800;
        timeoutRef.current = setTimeout(processNext, delay);
      }

      return {
        ...prevState,
        displayedContent: newDisplayedContent,
        currentBlockIndex: nextBlockIndex,
        currentCharInBlock: nextCharInBlock,
      };
    });
  }, [getPauseAfterChar, blockRevealMode]);

  // Start typing animation
  const startTyping = useCallback(() => {
    if (isInterruptedRef.current || state.blocks.length === 0) return;

    setState((prev) => ({ ...prev, isTyping: true }));
    timeoutRef.current = setTimeout(processNext, delayBeforeStart);
  }, [processNext, delayBeforeStart, state.blocks.length]);

  // Handle interrupt
  const handleInterrupt = useCallback(() => {
    if (!allowInterrupt || state.isComplete) return;

    isInterruptedRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      displayedContent: content,
      isTyping: false,
      isComplete: true,
      currentBlockIndex: prev.blocks.length,
      currentCharInBlock: 0,
    }));

    onInterrupt?.();
  }, [allowInterrupt, state.isComplete, content, onInterrupt]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current && state.isTyping) {
      const container = containerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [state.displayedContent, state.isTyping]);

  // Handle completion
  useEffect(() => {
    if (state.isComplete && !isInterruptedRef.current) {
      onComplete?.();
    }
  }, [state.isComplete, onComplete]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        handleInterrupt();
      }
    };

    if (allowInterrupt && state.isTyping) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }

    // Return undefined if no cleanup needed
    return undefined;
  }, [allowInterrupt, state.isTyping, handleInterrupt]);

  // Start animation when blocks are ready
  useEffect(() => {
    if (state.blocks.length > 0 && !state.isTyping && !state.isComplete) {
      startTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state.blocks.length, state.isTyping, state.isComplete, startTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      isInterruptedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`smart-typing-container ${className}`}
      onClick={handleInterrupt}
      style={{
        cursor: allowInterrupt && state.isTyping ? "pointer" : "default",
      }}
    >
      <div className="relative">
        <MarkdownContent content={state.displayedContent} role="assistant" />

        {/* Typing cursor - show at end of current block */}
        {state.isTyping && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-text-bottom" />
        )}
      </div>

      {/* Subtle interrupt hint - only show on hover */}
      {allowInterrupt && state.isTyping && (
        <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-60">
          <div className="rounded bg-black/80 px-2 py-1 text-xs text-white shadow-lg">
            Click to show full response
          </div>
        </div>
      )}
    </div>
  );
}
