"use client";

import { ArrowUp, Square } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AttachmentPicker } from "~/components/ui/AttachmentPicker";
import { Button } from "~/components/ui/Button";
import { SpeechToTextButton } from "~/components/ui/SpeechToTextButton";
import { uploadFiles } from "~/lib/utils/upload";

interface ModelOption {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface ChatComposerHandle {
  /** Programmatically set the textarea value */
  setInput: (text: string) => void;
  /** Focus the textarea */
  focusInput: () => void;
}

interface ChatComposerProps {
  isTyping: boolean;
  /** Called when the user sends a team message (user-to-user) */
  onSubmit: (text: string) => void;
  /** Called when the user sends to AI */
  onSubmitToAI: (text: string) => void;
  onStop: () => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  modelDropdownOpen: boolean;
  setModelDropdownOpen: (v: boolean) => void;
  models: ModelOption[];
  /** External ref for the dropdown element so parent can detect outside clicks */
  dropdownRef: RefObject<HTMLDivElement | null>;

  // NEW: Collaboration support props (optional)
  isCollaborationMode?: boolean;
  isSendingToAI?: boolean;
  disabled?: boolean;
}

// Utility regex once to test image extension
const imageExtRegex = /\.(png|jpe?g|gif|webp|svg)$/i;

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  (
    {
      isTyping,
      onSubmit,
      onSubmitToAI,
      onStop,
      selectedModel,
      setSelectedModel,
      modelDropdownOpen,
      setModelDropdownOpen,
      models,
      dropdownRef,

      // NEW: Collaboration support props (optional)
      isCollaborationMode,
      isSendingToAI,
      disabled,
    }: ChatComposerProps,
    ref,
  ) => {
    // Internal textarea state & ref
    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // NEW: Chat mode state (AI vs Team chat)
    const [chatMode, setChatMode] = useState<"ai" | "team">("ai");

    // Expose imperative methods to parent
    useImperativeHandle(ref, () => ({
      setInput: (text: string) => setInput(text),
      focusInput: () => textareaRef.current?.focus(),
    }));

    // Auto-resize textarea height
    useEffect(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`;
    }, [input]);

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
        const target = e.target as Node;
        if (
          triggerRef.current?.contains(target) ||
          dropdownRefInternal.current?.contains(target)
        ) {
          return; // click inside trigger or dropdown – ignore
        }
        setModelDropdownOpen(false);
      };
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }, [modelDropdownOpen]);

    const handleSend = async () => {
      if (!input.trim() && attachments.length === 0) return;

      // Upload files and obtain public URLs
      let uploaded: { name: string; url: string }[] = [];
      try {
        uploaded = await uploadFiles(attachments);
      } catch (err: unknown) {
        console.error("Upload failed", err as Error);
      }

      const attachmentMarkdown = uploaded
        .map(({ name, url }) => {
          if (imageExtRegex.test(name)) {
            return `![${name}](${url})`;
          }
          return `[${name}](${url})`;
        })
        .join("\n");

      const finalContent = [input.trim(), attachmentMarkdown]
        .filter(Boolean)
        .join("\n\n");

      // NEW: Route to appropriate handler based on mode
      if (isCollaborationMode && chatMode === "team") {
        // Send as team message (user-to-user)
      onSubmit(finalContent);
      } else {
        // Send to AI (either collaboration AI mode or solo mode)
        onSubmitToAI(finalContent);
      }

      setInput("");
      setAttachments([]);
    };

    const info = models.find((m) => m.id === selectedModel);

    return (
      <footer
        data-fixed
        className="pointer-events-none fixed right-0 bottom-4 left-0 flex justify-center"
      >
        <div className="pointer-events-auto w-full max-w-3xl px-4">
          <div className="bg-surface-2 dark:bg-surface-1/95 glass-effect rounded-xl p-4 shadow backdrop-blur-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="relative"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={
                    isCollaborationMode && chatMode === "team"
                      ? "Send a message to the team..."
                      : isCollaborationMode && chatMode === "ai"
                        ? "Ask AI a question..."
                        : "Type a message..."
                  }
                  className="text-surface-1 placeholder:text-surface-1/50 flex-1 resize-none border-none bg-transparent px-4 py-2 text-base focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none"
                  style={{
                    height: `${Math.min(textareaRef.current?.scrollHeight ?? 0, 200)}px`,
                    outline: "none",
                    boxShadow: "none",
                    border: "none",
                  }}
                />
              </div>

              {/* Second row */}
              <div className="mt-1 flex items-center justify-between px-1 text-[11px]">
                {/* Left icons */}
                <div className="flex items-center gap-2">
                  <AttachmentPicker
                    attachments={attachments}
                    setAttachments={setAttachments}
                    buttonSize={20}
                  />
                  <SpeechToTextButton
                    buttonSize={20}
                    onResult={(transcript) =>
                      setInput((prev) => `${prev} ${transcript}`.trim())
                    }
                  />
                </div>

                {/* Center: Collaboration mode toggle */}
                {isCollaborationMode && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChatMode("ai")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                        chatMode === "ai"
                          ? "bg-purple-600 text-white"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatMode("team")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                        chatMode === "team"
                          ? "bg-blue-600 text-white"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      Team
                    </button>
                  </div>
                )}

                {/* Right cluster */}
                <div className="flex items-center gap-2">
                  {/* Model selector */}
                  <div ref={dropdownRef} className="relative self-center">
                    <Button
                      ref={triggerRef}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      title={info?.description ?? ""}
                      className="h-6 px-2"
                    >
                      <span className="max-w-[90px] truncate text-[11px] font-medium">
                        {info?.name ?? "Model"}
                      </span>
                      <svg
                        width="7"
                        height="7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`ml-0.5 transition-transform duration-200 ${
                          modelDropdownOpen ? "rotate-180" : ""
                        }`}
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
                      <div
                        ref={dropdownRefInternal}
                        className="absolute right-0 bottom-full z-50 mb-1 w-40 rounded-md bg-neutral-900 shadow-lg"
                      >
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            disabled={!model.enabled}
                            onClick={() => {
                              if (model.enabled) {
                                console.log("Selecting model", model.id);
                                setSelectedModel(model.id);
                                setModelDropdownOpen(false);
                              }
                            }}
                            className={`block w-full px-2 py-1 text-left text-xs first:rounded-t-md last:rounded-b-md hover:bg-neutral-800 ${
                              selectedModel === model.id
                                ? "text-white"
                                : "text-gray-300"
                            } ${!model.enabled ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send / Stop */}
                  {isTyping || isSendingToAI || disabled ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onStop}
                      aria-label="Stop response generation"
                      className={`bg-surface-0 text-primary ring-border-subtle flex h-5 w-5 items-center justify-center rounded-full ring-1 ${
                        isTyping || isSendingToAI ? "animate-pulse" : ""
                      }`}
                      style={{ animationDuration: "2.5s" }}
                    >
                      <Square size={9} />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="icon"
                      onClick={() => void handleSend()}
                      disabled={
                        (!input.trim() && attachments.length === 0) || disabled
                      }
                      className="h-5 w-5"
                    >
                      <ArrowUp size={11} strokeWidth={2.5} />
                    </Button>
                  )}
                </div>
              </div>

              {/* chips row */}
              {attachments.length > 0 && (
                <div className="my-1 flex flex-wrap gap-1 px-1">
                  {attachments.map((file, idx) => (
                    <span
                      key={idx}
                      className="bg-surface-1 text-muted flex items-center gap-1 rounded px-2 py-0.5 text-xs"
                    >
                      {file.name}
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      </footer>
    );
  },
);

ChatComposer.displayName = "ChatComposer";

export default ChatComposer;
