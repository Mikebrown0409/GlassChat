"use client";

import { AnimatePresence, motion } from "framer-motion";
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
            className="border-surface-2/20 bg-surface-1/80 fixed z-50 flex items-center gap-1 rounded-lg border p-1 shadow-lg backdrop-blur-md"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <button
              onClick={() => handleAction("copy")}
              className="text-surface-1 hover:bg-surface-2/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy
            </button>
            <button
              onClick={() => handleAction("translate")}
              className="text-surface-1 hover:bg-surface-2/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              Translate
            </button>
            <button
              onClick={() => handleAction("explain")}
              className="text-surface-1 hover:bg-surface-2/20 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Explain
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
