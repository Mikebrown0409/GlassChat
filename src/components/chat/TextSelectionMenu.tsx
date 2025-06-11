"use client";

import { motion } from "framer-motion";
import { Check, Copy, Languages, Sparkles } from "lucide-react";
import { useState } from "react";

// Professional easing curve for all animations
const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

interface TextSelectionMenuProps {
  position: { top: number; left: number };
  onCopy: () => void;
  onExplain: () => void;
  onTranslate: () => void;
}

export const TextSelectionMenu = ({
  position,
  onCopy,
  onExplain,
  onTranslate,
}: TextSelectionMenuProps) => {
  const [copied, setCopied] = useState(false);
  const [explained, setExplained] = useState(false);
  const [translated, setTranslated] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = () => {
    onExplain();
    setExplained(true);
    setTimeout(() => setExplained(false), 2000);
  };

  const handleTranslate = () => {
    onTranslate();
    setTranslated(true);
    setTimeout(() => setTranslated(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 5 }}
      transition={{ duration: 0.15, ease: DYNAMIC_EASE }}
      className="border-border-subtle bg-surface-1/90 absolute z-50 flex items-center gap-1 rounded-lg border p-1.5 shadow-2xl backdrop-blur-sm"
      style={{ top: position.top, left: position.left }}
      data-selection-menu
      onMouseDown={(e) => e.stopPropagation()} // Prevent selection clearing
      onMouseUp={(e) => e.stopPropagation()} // Prevent menu from disappearing when clicking it
      onClick={(e) => e.stopPropagation()} // Prevent event bubbling
    >
      <button
        onClick={handleCopy}
        className="group text-muted hover:bg-surface-0 hover:text-primary relative rounded-md p-2 transition-all duration-200 hover:scale-105"
        title="Copy selected text"
        aria-label="Copy selected text"
      >
        {copied ? (
          <Check size={14} className="text-brand-utility" />
        ) : (
          <Copy size={14} />
        )}
        <span className="bg-surface-0 text-primary pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {copied ? "Copied!" : "Copy"}
        </span>
      </button>
      <div className="bg-border-subtle h-5 w-[1px]" />
      <button
        onClick={handleExplain}
        className="group text-muted hover:bg-surface-0 hover:text-primary relative rounded-md p-2 transition-all duration-200 hover:scale-105"
        title="Ask AI to explain this text"
        aria-label="Ask AI to explain this text"
      >
        {explained ? (
          <Check size={14} className="text-brand-utility" />
        ) : (
          <Sparkles size={14} />
        )}
        <span className="bg-surface-0 text-primary pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {explained ? "Added to input!" : "Explain"}
        </span>
      </button>
      <button
        onClick={handleTranslate}
        className="group text-muted hover:bg-surface-0 hover:text-primary relative rounded-md p-2 transition-all duration-200 hover:scale-105"
        title="Ask AI to translate this text"
        aria-label="Ask AI to translate this text"
      >
        {translated ? (
          <Check size={14} className="text-brand-utility" />
        ) : (
          <Languages size={14} />
        )}
        <span className="bg-surface-0 text-primary pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {translated ? "Added to input!" : "Translate"}
        </span>
      </button>
    </motion.div>
  );
};
