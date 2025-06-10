"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Brain,
  Check,
  Code,
  Copy,
  Edit3,
  ExternalLink,
  Languages,
  MoreHorizontal,
  Plus,
  Search,
  Sidebar,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { AIModel } from "~/lib/ai/types";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager, useLiveChats, useLiveMessages } from "~/lib/sync";
import { api } from "~/trpc/react";

interface ChatInterfaceProps {
  className?: string;
}

// Message type definition for proper typing
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  updatedAt?: number;
}

// Professional easing curve for all animations
const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

// --- TextSelectionMenu Component Definition ---
interface TextSelectionMenuProps {
  position: { top: number; left: number };
  onCopy: () => void;
  onExplain: () => void;
  onTranslate: () => void;
}

const TextSelectionMenu = ({
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
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/90 p-1.5 shadow-2xl backdrop-blur-sm"
      style={{ top: position.top, left: position.left }}
      data-selection-menu
      onMouseDown={(e) => e.stopPropagation()} // Prevent selection clearing
      onMouseUp={(e) => e.stopPropagation()} // Prevent menu from disappearing when clicking it
      onClick={(e) => e.stopPropagation()} // Prevent event bubbling
    >
      <button
        onClick={handleCopy}
        className="group relative rounded-md p-2 text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-slate-700/80 hover:text-white"
        title="Copy selected text"
        aria-label="Copy selected text"
      >
        {copied ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} />
        )}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {copied ? "Copied!" : "Copy"}
        </span>
      </button>
      <div className="h-5 w-[1px] bg-slate-700/50" />
      <button
        onClick={handleExplain}
        className="group relative rounded-md p-2 text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-slate-700/80 hover:text-white"
        title="Ask AI to explain this text"
        aria-label="Ask AI to explain this text"
      >
        {explained ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Sparkles size={14} />
        )}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {explained ? "Added to input!" : "Explain"}
        </span>
      </button>
      <button
        onClick={handleTranslate}
        className="group relative rounded-md p-2 text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-slate-700/80 hover:text-white"
        title="Ask AI to translate this text"
        aria-label="Ask AI to translate this text"
      >
        {translated ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Languages size={14} />
        )}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 transform rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {translated ? "Added to input!" : "Translate"}
        </span>
      </button>
    </motion.div>
  );
};
// -----------------------------------------

// Enhanced CodeBlock component with copy functionality
const CodeBlock = ({
  children,
  className,
  language,
}: {
  children: string;
  className?: string;
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Copy button clicked, text to copy:", children);

      // Ensure document is focused
      window.focus();
      document.body.focus();

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(children)
          .then(() => {
            console.log("Clipboard copy successful");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((err) => {
            console.error("Clipboard copy failed:", err);
            fallbackCopy(children);
          });
      } else {
        console.log("Using fallback copy method");
        fallbackCopy(children);
      }
    },
    [children],
  );

  const fallbackCopy = (text: string) => {
    console.log("Executing fallback copy for:", text);
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.setAttribute("readonly", "");
      textArea.setAttribute("aria-hidden", "true");

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const result = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (result) {
        console.log("Fallback copy successful");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        console.error("Fallback copy failed");
        alert("Copy failed. Please try selecting and copying manually.");
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
      alert("Copy failed. Please try selecting and copying manually.");
    }
  };

  // Extract language from className (format: language-javascript)
  const detectedLanguage =
    className?.replace("language-", "") ?? language ?? "text";

  return (
    <div className="group relative my-4">
      <div className="flex items-center justify-between rounded-t-lg border-b border-slate-700 bg-slate-800 px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Code size={12} />
          {detectedLanguage}
        </span>
        <button
          onClick={handleCopy}
          onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
          type="button"
          className="flex items-center gap-1 rounded border border-transparent px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="font-medium text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-lg bg-slate-900 p-4">
        <code className={clsx("font-mono text-sm", className)}>{children}</code>
      </pre>
    </div>
  );
};

// Enhanced Message Display Component with Text Selection
const MessageDisplay = React.memo(
  function MessageDisplay({
    message,
    onTextSelect,
  }: {
    message: Message;
    onTextSelect?: (
      text: string,
      position: { top: number; left: number },
    ) => void;
  }) {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";
    const [displayedContent, setDisplayedContent] = useState("");

    // Handle typing animation for assistant messages
    useEffect(() => {
      if (message.role === "assistant") {
        const isRecentMessage = Date.now() - message.createdAt < 10000;

        if (!isRecentMessage) {
          setDisplayedContent(message.content);
          return;
        }

        // Check if there's already a text selection anywhere on the page
        if (typeof window !== "undefined") {
          const hasInitialSelection = window.getSelection()?.toString().trim();
          if (hasInitialSelection) {
            // Skip animation entirely if user already has text selected
            setDisplayedContent(message.content);
            return;
          }
        }

        // Typing animation for new messages
        let currentIndex = 0;
        setDisplayedContent("");

        const intervalId = setInterval(() => {
          // Constantly check if user has started selecting text
          if (typeof window !== "undefined") {
            const hasSelection = window.getSelection()?.toString().trim();
            if (hasSelection) {
              clearInterval(intervalId);
              setDisplayedContent(message.content); // Show full content immediately
              return;
            }
          }

          if (currentIndex < message.content.length) {
            setDisplayedContent(message.content.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(intervalId);
          }
        }, 20);

        return () => clearInterval(intervalId);
      } else {
        setDisplayedContent(message.content);
        return;
      }
    }, [message.content, message.createdAt, message.role]);

    // Handle text selection
    const handleMouseUp = (e: React.MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Immediate selection detection - no delay needed
      const selection = window.getSelection();
      const selectionText = selection?.toString().trim();

      if (selectionText && onTextSelect) {
        // Position menu near the mouse cursor
        const top = mouseY + window.scrollY + 10;
        let left = mouseX + window.scrollX - 100;

        // Ensure menu stays within viewport
        const menuWidth = 200;
        const viewportWidth = window.innerWidth;

        if (left + menuWidth > viewportWidth - 20) {
          left = viewportWidth - menuWidth - 20;
        }
        if (left < 20) {
          left = 20;
        }

        onTextSelect(selectionText, { top, left });
      }
    };

    return (
      <div className="space-y-2">
        <div
          className={clsx(
            "max-w-prose rounded-lg border p-4 transition-colors select-text group-hover:border-slate-700/80",
            isUser
              ? "border-slate-700/50 bg-slate-800/50 text-slate-200"
              : isSystem
                ? "border-red-900 bg-red-900/20 text-red-300"
                : "border-slate-900 bg-black text-slate-300",
          )}
          onMouseUp={handleMouseUp}
        >
          {isUser || isSystem ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div
              className="prose prose-sm prose-invert prose-headings:text-slate-100 prose-p:text-slate-300 prose-code:text-slate-200 prose-pre:bg-slate-900 prose-blockquote:border-blue-500 prose-strong:text-slate-200 prose-em:text-slate-300 max-w-none select-text"
              onMouseUp={handleMouseUp}
            >
              <ReactMarkdown
                components={{
                  code: ({
                    children,
                    className,
                  }: {
                    children?: React.ReactNode;
                    className?: string;
                  }) => {
                    const isInlineCode = !className;

                    // Safely convert ReactNode to string - simplified approach
                    const getCodeContent = (node: React.ReactNode): string => {
                      if (typeof node === "string") return node;
                      if (typeof node === "number") return String(node);
                      if (typeof node === "boolean") return String(node);
                      if (node === null || node === undefined) return "";
                      if (Array.isArray(node)) {
                        return node
                          .map((child: React.ReactNode) =>
                            getCodeContent(child),
                          )
                          .join("");
                      }
                      // For React elements, just return empty string to avoid unsafe operations
                      return "";
                    };

                    const codeString = getCodeContent(children).replace(
                      /\n$/,
                      "",
                    );

                    if (isInlineCode) {
                      return (
                        <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-slate-200">
                          {codeString}
                        </code>
                      );
                    }

                    return (
                      <CodeBlock
                        className={className}
                        language={className?.replace("language-", "")}
                      >
                        {codeString}
                      </CodeBlock>
                    );
                  },
                  pre: ({ children }: { children?: React.ReactNode }) => (
                    <>{children}</>
                  ), // Let CodeBlock handle the pre tag
                  h1: ({ children }: { children?: React.ReactNode }) => (
                    <h1 className="mt-6 mb-4 border-b border-slate-700 pb-2 text-xl font-bold text-slate-100">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }: { children?: React.ReactNode }) => (
                    <h2 className="mt-5 mb-3 text-lg font-semibold text-slate-200">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }: { children?: React.ReactNode }) => (
                    <h3 className="mt-4 mb-2 text-base font-medium text-slate-300">
                      {children}
                    </h3>
                  ),
                  p: ({ children }: { children?: React.ReactNode }) => (
                    <p className="mb-4 leading-relaxed text-slate-300">
                      {children}
                    </p>
                  ),
                  ul: ({ children }: { children?: React.ReactNode }) => (
                    <ul className="mb-4 ml-4 list-outside list-disc space-y-2 text-slate-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }: { children?: React.ReactNode }) => (
                    <ol className="mb-4 ml-4 list-outside list-decimal space-y-2 text-slate-300">
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }: React.ComponentProps<"li">) => (
                    <li className="text-slate-300" {...props}>
                      {children}
                    </li>
                  ),
                  blockquote: ({
                    children,
                  }: {
                    children?: React.ReactNode;
                  }) => (
                    <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500 bg-slate-800/50 py-2 pl-4 text-slate-400 italic">
                      {children}
                    </blockquote>
                  ),
                  a: ({
                    children,
                    href,
                  }: {
                    children?: React.ReactNode;
                    href?: string;
                  }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 underline transition-colors hover:text-blue-300"
                    >
                      {children}
                      <ExternalLink size={12} />
                    </a>
                  ),
                  table: ({ children }: { children?: React.ReactNode }) => (
                    <div className="my-4 overflow-x-auto">
                      <table className="min-w-full rounded-lg border border-slate-700">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }: { children?: React.ReactNode }) => (
                    <thead className="bg-slate-800">{children}</thead>
                  ),
                  tbody: ({ children }: { children?: React.ReactNode }) => (
                    <tbody className="bg-slate-900/50">{children}</tbody>
                  ),
                  tr: ({ children }: { children?: React.ReactNode }) => (
                    <tr className="border-b border-slate-700">{children}</tr>
                  ),
                  th: ({ children }: { children?: React.ReactNode }) => (
                    <th className="px-4 py-2 text-left font-semibold text-slate-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }: { children?: React.ReactNode }) => (
                    <td className="px-4 py-2 text-slate-300">{children}</td>
                  ),
                  hr: () => <hr className="my-6 border-slate-700" />,
                  strong: ({ children }: { children?: React.ReactNode }) => (
                    <strong className="font-semibold text-slate-200">
                      {children}
                    </strong>
                  ),
                  em: ({ children }: { children?: React.ReactNode }) => (
                    <em className="text-slate-300 italic">{children}</em>
                  ),
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 pl-1 text-xs text-slate-600">
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // This custom comparison function is the key to preventing re-renders.
    // It only re-renders if the message content or update timestamp changes.
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.updatedAt === nextProps.message.updatedAt
    );
  },
);
MessageDisplay.displayName = "MessageDisplay"; // For easier debugging in React DevTools

// Lazy-load heavy panels to reduce initial JS bundle
const CollaborationPanel = dynamic(
  () =>
    import("~/components/collaboration/CollaborationPanel").then(
      (m) => m.CollaborationPanel,
    ),
  { ssr: false, loading: () => null },
);

const MemoryPanel = dynamic(
  () => import("~/components/memory/MemoryPanel").then((m) => m.MemoryPanel),
  { ssr: false, loading: () => null },
);

export function ChatInterface({ className: _className }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Gemini 2.0 Flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMenu, setSelectionMenu] = useState<{
    position: { top: number; left: number };
    text: string;
  } | null>(null);

  // Use ref to access current selectionMenu state in event handlers without causing re-renders
  const selectionMenuRef = useRef(selectionMenu);
  selectionMenuRef.current = selectionMenu;
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  // Debug currentChatId changes
  useEffect(() => {
    console.log("Debug - currentChatId changed to:", currentChatId);
  }, [currentChatId]);
  const [conversationMenus, setConversationMenus] = useState<
    Record<string, boolean>
  >({});
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);

  const chats = useLiveChats();
  const rawMessages = useLiveMessages(currentChatId ?? "");
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  // tRPC mutation for AI responses
  const generateResponse = api.ai.generateResponse.useMutation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-select first chat if none selected
  useEffect(() => {
    if (!currentChatId && chats && chats.length > 0) {
      setCurrentChatId(chats[0]?.id);
    }
  }, [chats, currentChatId]);

  // Create initial chat if none exist
  useEffect(() => {
    const createInitialChat = async () => {
      if (chats && chats.length === 0) {
        try {
          const newChat = await syncManager.createChat("New Conversation");
          setCurrentChatId(newChat.id);
        } catch (error) {
          console.error("Failed to create initial chat:", error);
        }
      }
    };
    if (chats !== undefined) {
      void createInitialChat();
    }
  }, [chats]);

  useEffect(() => {
    // Don't auto-scroll if user has text selected to avoid interfering with selection
    if (typeof window !== "undefined") {
      const hasSelection = window.getSelection()?.toString().trim();
      if (!hasSelection) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // On server-side, just scroll normally
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle mouse events for dropdown and selection menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setModelDropdownOpen(false);
      }

      // Only close selection menu when clicking outside message areas
      if (selectionMenuRef.current) {
        const target = event.target as Element;
        const isInSelectionMenu = target.closest("[data-selection-menu]");
        const isInMessageContent =
          target.closest(".prose") ?? target.closest(".max-w-prose");
        const isInTextArea =
          target.closest("textarea") ?? target.closest("input");
        const isInButton = target.closest("button");

        // Don't clear if:
        // - Clicking on the selection menu
        // - Clicking in message content (might be selecting more text)
        // - Clicking in input areas
        // - Clicking on buttons (they handle their own clearing)
        if (
          !isInSelectionMenu &&
          !isInMessageContent &&
          !isInTextArea &&
          !isInButton
        ) {
          setSelectionMenu(null);
          // Only clear browser selection if clicking completely outside content
          // This allows users to click elsewhere and still use Cmd+C if they want
          setTimeout(() => {
            window.getSelection()?.removeAllRanges();
          }, 50);
        }
      }
    };

    // Use capture phase to handle clicks before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, []); // Remove selectionMenu dependency to prevent constant re-registration

  // Text selection handlers
  const handleCopySelection = () => {
    if (selectionMenu?.text) {
      // Ensure document is focused before attempting clipboard operation
      window.focus();
      document.body.focus();

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(selectionMenu.text)
          .then(() => {
            console.log("Selection copied successfully");
            // Don't clear the selection or menu - let user copy again or use Cmd+C
            // setSelectionMenu(null);
            // window.getSelection()?.removeAllRanges();
          })
          .catch((err) => {
            console.error("Clipboard API failed:", err);
            fallbackCopy(selectionMenu.text);
          });
      } else {
        // Use fallback method immediately
        fallbackCopy(selectionMenu.text);
      }
    }
  };

  // Reliable fallback copy method
  const fallbackCopy = (text: string) => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.setAttribute("readonly", "");
      textArea.setAttribute("aria-hidden", "true");

      document.body.appendChild(textArea);

      // Focus and select the text
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      // Execute copy command
      const result = document.execCommand("copy");

      // Clean up
      document.body.removeChild(textArea);

      if (result) {
        console.log("Fallback copy successful");
        // Don't clear the original selection - preserve it for user
        // setSelectionMenu(null);
        // window.getSelection()?.removeAllRanges();
      } else {
        console.error("Fallback copy failed");
        alert("Copy failed. Please try selecting and copying manually.");
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
      alert("Copy failed. Please try selecting and copying manually.");
    }
  };

  const handleExplainSelection = async () => {
    if (selectionMenu?.text && currentChatId) {
      const explanationPrompt = `Please explain this text: "${selectionMenu.text}"`;
      setInputValue(explanationPrompt);
      // Only clear menu, keep the text selection highlighted
      setSelectionMenu(null);
      // Don't clear the text selection - let user keep it highlighted
      // window.getSelection()?.removeAllRanges();
    }
  };

  const handleTranslateSelection = async () => {
    if (selectionMenu?.text && currentChatId) {
      const translationPrompt = `Please translate this text to English: "${selectionMenu.text}"`;
      setInputValue(translationPrompt);
      // Only clear menu, keep the text selection highlighted
      setSelectionMenu(null);
      // Don't clear the text selection - let user keep it highlighted
      // window.getSelection()?.removeAllRanges();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentChatId || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    try {
      await syncManager.createMessage(currentChatId, "user", userMessage);
      await memory.addMemory(userMessage, { role: "user" });

      const map: Record<string, AIModel> = {
        "Gemini 2.0 Flash": AIModel.GEMINI_2_0_FLASH,
        "GPT-4 Turbo": AIModel.GPT_4_TURBO,
        "Claude 3": AIModel.CLAUDE_3_SONNET,
      };
      const aiModel = map[selectedModel] ?? AIModel.GEMINI_2_0_FLASH;

      const systemPrompt = `You are a helpful AI assistant with a perfect memory of the conversation so far.
Your task is to continue the chat. Use the provided message history to answer questions and maintain context.
Be helpful and engaging.`;

      // The history should NOT include the latest user message
      const history = messagesRef.current.slice(0, -1);

      const preparedMessages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user" as const, content: userMessage },
      ];

      const response = await generateResponse.mutateAsync({
        model: aiModel,
        messages: preparedMessages,
      });

      if (response.success && response.response?.content) {
        await syncManager.createMessage(
          currentChatId,
          "assistant",
          response.response.content,
        );
        await memory.addMemory(response.response.content, {
          role: "assistant",
        });
      } else {
        await syncManager.createMessage(
          currentChatId,
          "system",
          "Sorry, I encountered an error while processing your message. Please try again.",
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Create error message
      if (currentChatId) {
        await syncManager.createMessage(
          currentChatId,
          "system",
          "Sorry, I encountered an error while processing your message. Please try again.",
        );
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleNewChat = async () => {
    try {
      console.log("Debug - Creating new chat...");
      const newChat = await syncManager.createChat("New Conversation");
      console.log("Debug - Created new chat:", newChat);
      console.log("Debug - Setting currentChatId to:", newChat.id);
      setCurrentChatId(newChat.id);
      console.log("Debug - currentChatId state should now be:", newChat.id);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    setConversationMenus({}); // Close all menus
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await syncManager.updateChat(chatId, { title: newTitle });
      setRenamingChat(null);
      setRenameValue("");
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Import db directly to delete chat and its messages
      const { db } = await import("~/lib/db");

      // Delete all messages in this chat first
      await db.messages.where("chatId").equals(chatId).delete();

      // Delete the chat itself
      await db.chats.delete(chatId);

      // If we deleted the current chat, select another one
      if (currentChatId === chatId) {
        const remainingChats = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .toArray();
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0]?.id);
        } else {
          setCurrentChatId(undefined);
        }
      }

      setConversationMenus({});
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const toggleConversationMenu = (chatId: string) => {
    setConversationMenus((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  const filteredHistory = (chats ?? []).filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const models = [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Fastest and newest",
    },
    { id: "gpt-4", name: "GPT-4 Turbo", description: "Most capable model" },
    { id: "claude-3", name: "Claude 3", description: "Great for analysis" },
  ];

  // Handle keyboard shortcuts for selection menu
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (selectionMenuRef.current) {
        // Handle Cmd+C or Ctrl+C - allow native copy behavior
        if ((e.metaKey || e.ctrlKey) && e.key === "c") {
          return;
        }

        // Clear the menu and browser selection on escape key
        if (e.key === "Escape") {
          setSelectionMenu(null);
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // Clear the menu on major scroll, but not the text selection
      if (selectionMenuRef.current) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setSelectionMenu(null);
        }, 1000);
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
      document.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex h-screen w-screen overflow-hidden bg-black font-sans text-slate-200">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, x: -300 }}
            animate={{ width: 300, x: 0 }}
            exit={{ width: 0, x: -300 }}
            transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
            className="flex flex-col border-r border-slate-900 bg-[#080808]"
          >
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-900 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-400"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">
                    GlassChat
                  </h1>
                  <p className="text-sm text-slate-500">AI Platform</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white"
                title="Collapse Sidebar"
              >
                <Sidebar size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleNewChat()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-slate-600 hover:bg-slate-700/80 hover:text-white"
              >
                <Plus size={16} />
                New Conversation
              </motion.button>
            </div>

            {/* Search Input */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pr-3 pl-9 text-sm text-slate-300 placeholder-slate-500 transition-colors focus:border-slate-600 focus:bg-slate-800/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <AnimatePresence>
                {filteredHistory.map((chat) => (
                  <div key={chat.id} className="relative">
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, ease: DYNAMIC_EASE }}
                      onClick={() => handleChatSelect(chat.id)}
                      className={clsx(
                        "group w-full cursor-pointer rounded-md p-2 text-left transition-colors duration-200",
                        currentChatId === chat.id
                          ? "bg-slate-700/80 text-slate-100"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        {renamingChat === chat.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => {
                              if (renameValue.trim()) {
                                void handleRenameChat(
                                  chat.id,
                                  renameValue.trim(),
                                );
                              } else {
                                setRenamingChat(null);
                                setRenameValue("");
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renameValue.trim()) {
                                void handleRenameChat(
                                  chat.id,
                                  renameValue.trim(),
                                );
                              } else if (e.key === "Escape") {
                                setRenamingChat(null);
                                setRenameValue("");
                              }
                            }}
                            className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-sm font-normal">
                            {chat.title}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <AnimatePresence>
                            {searchQuery === "" && renamingChat !== chat.id && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-slate-600"
                              >
                                {new Date(chat.updatedAt).toLocaleDateString()}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {renamingChat !== chat.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleConversationMenu(chat.id);
                              }}
                              className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-700/50"
                              data-conversation-menu
                            >
                              <MoreHorizontal
                                size={14}
                                className="text-slate-400"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Conversation Menu */}
                    <AnimatePresence>
                      {conversationMenus[chat.id] && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15, ease: DYNAMIC_EASE }}
                          className="absolute top-full right-0 z-50 mt-1 w-40 rounded-lg border border-slate-700/50 bg-slate-800/90 shadow-xl backdrop-blur-xl"
                          data-conversation-menu
                        >
                          <button
                            onClick={() => {
                              setRenamingChat(chat.id);
                              setRenameValue(chat.title);
                              setConversationMenus({});
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition-colors first:rounded-t-lg hover:bg-slate-700/50"
                          >
                            <Edit3 size={14} />
                            Rename
                          </button>
                          <button
                            onClick={() => void handleDeleteChat(chat.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors last:rounded-b-lg hover:bg-red-900/20"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-900 p-4">
              <button className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200">
                <div className="h-8 w-8 rounded-full bg-slate-700"></div>
                <div className="flex-1 truncate">Chat User</div>
                <MoreHorizontal size={16} />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        <AnimatePresence>
          {selectionMenu && (
            <TextSelectionMenu
              position={selectionMenu.position}
              onCopy={handleCopySelection}
              onExplain={handleExplainSelection}
              onTranslate={handleTranslateSelection}
            />
          )}
        </AnimatePresence>
        {/* Top Bar */}
        <header
          data-fixed
          className="flex h-16 shrink-0 items-center justify-between border-b border-slate-900 bg-black/80 px-6 backdrop-blur-sm"
        >
          <div className="flex items-center">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-4 -ml-2 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
              >
                <Sidebar size={20} />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-300">Voice AI Assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollaborationOpen(!collaborationOpen)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Users size={20} />
            </button>

            <button
              onClick={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Brain size={20} />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-slate-500"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="mb-1 text-xl font-semibold text-white">
                How can I help you today?
              </h2>
              <p className="mx-auto mb-8 max-w-sm text-slate-500">
                Ask me anything about voice AI, speech-to-text, or audio
                intelligence implementation.
              </p>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  "How to get started with real-time transcription?",
                  "Explain your different voice AI models.",
                  "How to reduce audio processing costs?",
                ].map((suggestion, i) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: 0.2 + i * 0.1, ease: DYNAMIC_EASE },
                    }}
                    whileHover={{ y: -2, transition: { ease: DYNAMIC_EASE } }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="rounded-full border border-slate-700/80 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-8 p-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
                    className={clsx(
                      "group flex gap-4",
                      message.role === "user" ? "flex-row-reverse" : "",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        message.role === "user"
                          ? "bg-slate-700 text-slate-300"
                          : message.role === "system"
                            ? "bg-red-800 text-red-300"
                            : "bg-slate-800 text-slate-400",
                      )}
                    >
                      {message.role === "user"
                        ? "You"
                        : message.role === "system"
                          ? "!"
                          : "AI"}
                    </div>
                    <div className="space-y-2">
                      <MessageDisplay
                        message={message}
                        onTextSelect={(text, position) => {
                          // Set menu immediately when selection is detected
                          setSelectionMenu({ position, text });
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator Area (fixed height to prevent CLS) */}
              <div style={{ minHeight: 40 }}>
                {(isTyping || generateResponse.isPending) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ ease: DYNAMIC_EASE }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800">
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-slate-400"
                        animate={{
                          scale: [1, 1.25, 1],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </div>
                    <div className="rounded-lg border border-slate-900 bg-black p-4">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-slate-500"
                            animate={{ y: [0, -2, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <footer
          data-fixed
          className="border-t border-slate-900 bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit(e);
                    }
                  }}
                  placeholder={
                    isTyping ? "AI is responding..." : "Ask anything..."
                  }
                  className="max-h-48 min-h-[50px] w-full resize-none rounded-lg border border-slate-700 bg-slate-900/50 p-3 pr-28 text-sm text-slate-200 placeholder-slate-500 transition-colors duration-200 outline-none focus:border-slate-600 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                  rows={1}
                  disabled={isTyping}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <div ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-md bg-slate-800/50 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-slate-200"
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
                    </button>
                    {modelDropdownOpen && (
                      <div className="absolute right-0 bottom-full z-50 mb-2 w-48 rounded-lg border border-slate-700 bg-slate-800 shadow-2xl">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700/80 ${
                              selectedModel === model.name
                                ? "text-blue-400"
                                : "text-slate-200"
                            }`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!inputValue.trim() || isTyping}
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                      inputValue.trim() && !isTyping
                        ? "bg-white text-black"
                        : "cursor-not-allowed bg-slate-800 text-slate-500",
                    )}
                  >
                    {isTyping ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                    ) : (
                      <ArrowUp size={18} strokeWidth={2.5} />
                    )}
                  </motion.button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Press <strong>Shift+Enter</strong> for a new line
                </span>
                <span
                  className={clsx(
                    "font-medium",
                    inputValue.length > 2000
                      ? "text-orange-400"
                      : "text-slate-600",
                  )}
                >
                  {inputValue.length} / 2000
                </span>
              </div>
            </form>
          </div>
        </footer>
      </main>

      {/* Lazy panels render only when open to avoid adding weight to initial paint */}
      {collaborationOpen && (
        <CollaborationPanel
          currentChatId={currentChatId ?? null}
          isOpen={collaborationOpen}
          onToggle={() => setCollaborationOpen(!collaborationOpen)}
        />
      )}

      {isMemoryPanelOpen && (
        <MemoryPanel
          currentChatId={currentChatId ?? null}
          isOpen={isMemoryPanelOpen}
          onToggle={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)}
          memoryHook={memory}
        />
      )}
    </div>
  );
}

export default ChatInterface;
