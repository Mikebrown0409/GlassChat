"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Languages, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TextSelectionHandlerProps {
  onCopy?: (text: string) => void;
  onTranslate?: (text: string) => void;
  onExplain?: (text: string) => void;
  children: React.ReactNode;
}

export function TextSelectionHandler({
  onCopy,
  onTranslate,
  onExplain,
  children,
}: TextSelectionHandlerProps) {
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setMenuPosition(null);
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Store the range for later use
      selectionRangeRef.current = range.cloneRange();

      // Calculate menu position
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setMenuPosition({
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left + rect.width / 2,
      });

      setSelectedText(selection.toString().trim());
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuPosition(null);
        setSelectedText("");
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAction = (action: "copy" | "translate" | "explain") => {
    if (!selectedText) return;

    // Restore the selection before performing the action
    if (selectionRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(selectionRangeRef.current);
    }

    switch (action) {
      case "copy":
        void navigator.clipboard.writeText(selectedText);
        onCopy?.(selectedText);
        break;
      case "translate":
        onTranslate?.(selectedText);
        break;
      case "explain":
        onExplain?.(selectedText);
        break;
    }

    // Don't clear the selection immediately
    setTimeout(() => {
      setMenuPosition(null);
      setSelectedText("");
    }, 100);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}
      <AnimatePresence>
        {menuPosition && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="border-border-subtle bg-surface-0 absolute z-50 flex gap-1 rounded-lg border p-1 shadow-lg"
            style={{
              top: `${menuPosition.top - 40}px`,
              left: `${menuPosition.left}px`,
              transform: "translateX(-50%)",
            }}
          >
            <button
              onClick={() => handleAction("copy")}
              className="hover:bg-surface-1 rounded p-2 transition-colors"
              title="Copy"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => handleAction("translate")}
              className="hover:bg-surface-1 rounded p-2 transition-colors"
              title="Translate"
            >
              <Languages size={16} />
            </button>
            <button
              onClick={() => handleAction("explain")}
              className="hover:bg-surface-1 rounded p-2 transition-colors"
              title="Explain"
            >
              <Lightbulb size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
