"use client";

import { ArrowUp, Square } from "lucide-react";
import React, { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/Button";

interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

interface ChatComposerProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  isTyping: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  modelDropdownOpen: boolean;
  setModelDropdownOpen: (v: boolean) => void;
  models: ModelOption[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
}

export function ChatComposer({
  inputValue,
  setInputValue,
  isTyping,
  onSubmit,
  onStop,
  selectedModel,
  setSelectedModel,
  modelDropdownOpen,
  setModelDropdownOpen,
  models,
  textareaRef,
  dropdownRef,
}: ChatComposerProps) {
  // Local ref to the trigger button to calculate dropdown position
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [dropdownCoords, setDropdownCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Ref to measure dropdown height after it renders
  const dropdownRefInternal = useRef<HTMLDivElement>(null);

  // Re-calculate coordinates whenever dropdown opens or window resizes/scrolls
  useEffect(() => {
    if (!modelDropdownOpen) return;

    const calcCoords = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Default gap between dropdown and trigger
      const GAP = 6;

      // Measure dropdown height if already rendered
      const dropdownHeight = dropdownRefInternal.current?.offsetHeight ?? 0;

      setDropdownCoords({
        x: rect.right - 224 /* dropdown width */,
        // Position so the dropdown sits above the trigger
        y: rect.top - dropdownHeight - GAP,
      }); // 224px = w-56 in Tailwind
    };

    calcCoords();
    window.addEventListener("resize", calcCoords);
    window.addEventListener("scroll", calcCoords, true);
    return () => {
      window.removeEventListener("resize", calcCoords);
      window.removeEventListener("scroll", calcCoords, true);
    };
  }, [modelDropdownOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [modelDropdownOpen]);

  const dropdownElement =
    modelDropdownOpen && dropdownCoords
      ? createPortal(
          <div
            ref={dropdownRefInternal}
            className="fixed z-50 w-40 rounded-md border-none bg-neutral-900 shadow-lg"
            style={{ top: dropdownCoords.y, left: dropdownCoords.x }}
          >
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  setSelectedModel(model.name);
                  setModelDropdownOpen(false);
                }}
                className={`w-full px-2 py-1 text-left text-xs transition-colors first:rounded-t-md last:rounded-b-md hover:bg-neutral-800 ${
                  selectedModel === model.name ? "text-white" : "text-gray-300"
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <footer
      data-fixed
      className="pointer-events-none fixed right-0 bottom-4 left-0 flex justify-center"
    >
      <div className="pointer-events-auto w-full max-w-3xl px-4">
        <div className="border-border-subtle bg-surface-0/90 glass-effect focus-within:ring-brand-primary rounded-xl border p-4 shadow-lg backdrop-blur-lg focus-within:ring-2">
          <form onSubmit={onSubmit} className="relative">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Type a message..."
                className="text-surface-1 placeholder:text-surface-1/50 flex-1 resize-none bg-transparent px-4 py-2 text-sm focus:outline-none"
                style={{
                  height: `${Math.min(textareaRef.current?.scrollHeight ?? 0, 200)}px`,
                }}
              />
              <div className="flex items-center gap-2">
                <div ref={dropdownRef}>
                  <Button
                    ref={triggerRef}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  >
                    <span>{selectedModel}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className={`transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Button>
                </div>
                {isTyping ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onStop}
                    aria-label="Stop response generation"
                    className="bg-surface-0 text-primary ring-border-subtle flex h-8 w-8 animate-pulse items-center justify-center rounded-full ring-1"
                    style={{ animationDuration: "2.5s" }}
                  >
                    <Square size={14} />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="icon"
                    disabled={!inputValue.trim()}
                    className="h-8 w-8"
                  >
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 pb-1 text-xs">
              <span className="text-muted">
                Press <strong>Shift+Enter</strong> for a new line
              </span>
              <span
                className={
                  inputValue.length > 2000
                    ? "text-brand-secondary font-medium"
                    : "text-muted/70 font-medium"
                }
              >
                {inputValue.length} / 2000
              </span>
            </div>
          </form>
          {dropdownElement}
        </div>
      </div>
    </footer>
  );
}

export default ChatComposer;
