"use client";

import { ArrowUp, Square } from "lucide-react";
import React, { type RefObject } from "react";
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
                  {modelDropdownOpen && (
                    <div className="border-border-subtle bg-surface-0/95 ring-border-subtle shadow-3xl absolute right-0 bottom-full z-50 mb-2 w-56 rounded-xl ring-1 backdrop-blur-xl">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.name);
                            setModelDropdownOpen(false);
                          }}
                          className={`hover:bg-surface-0 w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            selectedModel === model.name
                              ? "text-brand-primary"
                              : "text-primary"
                          }`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  )}
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
        </div>
      </div>
    </footer>
  );
}

export default ChatComposer;
