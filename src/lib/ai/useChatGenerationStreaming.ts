import { useRef, useState } from "react";
import { AIModel } from "~/lib/ai/types";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager } from "~/lib/sync";
import { api } from "~/trpc/react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamingState {
  isStreaming: boolean;
  currentStreamContent: string;
  streamingMessageId: string | null;
  blockData?: Array<{
    content: string;
    block: {
      type: string;
      content: string;
      metadata?: Record<string, unknown>;
    };
    blockId: string;
  }>;
  lastBlockDataMessageId?: string | null; // Track which message has the block data
}

export function useChatGenerationStreaming(
  currentChatId: string | undefined,
  messages: Message[],
  selectedModel: string,
  enableBlockMode?: boolean, // Feature flag for block-aware streaming
) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentStreamContent: "",
    streamingMessageId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  const generateResponse = api.ai.generateResponse.useMutation();

  const handleSubmit = async (userInput: string, clearInput: () => void) => {
    if (!userInput.trim() || !currentChatId || streamingState.isStreaming)
      return;

    const userMessage = userInput.trim();
    clearInput();

    try {
      // Add user message
      await syncManager.createMessage(currentChatId, "user", userMessage);
      await memory.addMemory(userMessage, { role: "user" });

      // Map selected model to AIModel enum
      const map: Record<string, AIModel> = {
        "gemini-2.5-flash-lite-preview-06-17": AIModel.GEMINI_2_5_FLASH_LITE,
        "gpt-4o-mini": AIModel.GPT_4O_MINI,
        "gpt-4-turbo": AIModel.GPT_4_TURBO,
        "claude-3-sonnet-20240229": AIModel.CLAUDE_3_SONNET,
      };
      const aiModel = map[selectedModel] ?? AIModel.GEMINI_2_5_FLASH_LITE;

      // System prompt (same as original)
      const systemPrompt = `You are a helpful, clear, and professional AI assistant integrated into a chat-based interface. Your job is to produce structured, visually clean, and highly readable responses, especially for business, technical, or product use cases.

**Requirements for all responses:**

1. **Structure & Formatting**
   • Use clear headings (bolded using ** for markdown) to define sections (e.g., **Overview**, **Step-by-Step**, **Examples**).
   • Use numbered lists for processes, bullets for unordered data, and tables where comparisons or timelines are involved.
   • Insert line breaks between paragraphs and sections for white space and scannability.

2. **Visual Hierarchy**
   • Bold section headers.
   • Italicize emphasis where needed (not excessive).
   • Use monospace or inline code syntax (\`like this\`) for code, commands, or variable names.
   • Limit paragraphs to 3–4 lines max to avoid blocky text.

3. **Tables**
   • When a comparison, timeline, or matrix is needed, use a Markdown table with bold headers.
   • Always ensure table columns are aligned and meaningful.
   • Avoid breaking tables across multiple lines.
   • Example format:
   
   | **Phase** | **Timeline** | **Owner** | **Key Deliverable** |
   |-----------|--------------|-----------|---------------------|
   | Planning | Week 1–2 | PMO | Project charter, stakeholder map |
   | Data Migration | Week 3–5 | Data Team | Cleaned & mapped legacy data |

4. **Tone & Readability**
   • Keep the tone friendly but professional — like a clear-thinking peer helping another.
   • Break down complex ideas into plain English before introducing technical depth.
   • Avoid fluff; be concise, but never robotic.
   • When appropriate, summarize in a final "✅ **Summary**" section.

5. **Conversational Memory**
   • Always reference back to previous steps or context.
   • If the user asks a follow-up, carry knowledge forward cleanly.

6. **Optional Enhancements**
   • Add emojis for clarity/section marking if informal tone is acceptable (e.g., 📌, ✅, ⚙️).
   • Use collapsible sections if platform allows.
   • Provide copy-paste-friendly code snippets where relevant.

**Your responses should always be production-quality, readable on both desktop and mobile, and easily transferable to Notion, Google Docs, or a slide deck.**

Always apply these rules while answering based on the provided message history.`;

      const history = messagesRef.current.slice(0, -1);

      const preparedMessages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMessage },
      ];

      // Create an empty assistant message that will be updated as we stream
      const assistantMessage = await syncManager.createMessage(
        currentChatId,
        "assistant",
        "", // Start with empty content
      );

      // Set up streaming state
      setStreamingState({
        isStreaming: true,
        currentStreamContent: "",
        streamingMessageId: assistantMessage.id,
        blockData: undefined, // Reset block data for new stream
        lastBlockDataMessageId: undefined, // Reset block data tracking
      });

      // Create abort controller for this stream
      abortControllerRef.current = new AbortController();

      // Start HTTP streaming
      await startHttpStreaming(aiModel, preparedMessages, assistantMessage.id);
    } catch (err) {
      console.error("Failed to send message:", err);
      await syncManager.createMessage(
        currentChatId,
        "system",
        "Sorry, I encountered an error while processing your message. Please try again.",
      );
      setStreamingState({
        isStreaming: false,
        currentStreamContent: "",
        streamingMessageId: null,
        blockData: undefined, // Clear block data on error
        lastBlockDataMessageId: undefined, // Clear block data tracking
      });
    }
  };

  const startHttpStreaming = async (
    model: AIModel,
    messages: Array<{ role: string; content: string }>,
    messageId: string,
  ) => {
    try {
      const requestBody = {
        model,
        messages,
        // Enable server-side block detection when block mode is enabled
        blockAware: enableBlockMode ?? false,
        streamMode: enableBlockMode ? "simple" : "passthrough", // Use 'simple' for better performance
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[Streaming] API Request:", {
          blockAware: requestBody.blockAware,
          streamMode: requestBody.streamMode,
          enableBlockMode,
          model: requestBody.model,
          messageCount: requestBody.messages.length,
        });
      }

      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not supported");
      }

      const decoder = new TextDecoder();
      let accumulatedContent = "";
      // Buffer to throttle UI state updates so we don't re-render on every single token
      let pendingBuffer = "";
      let flushTimer: NodeJS.Timeout | null = null;

      // Track if we're receiving block-aware chunks
      let hasBlockData = false;
      const blockBuffer: Array<{
        content: string;
        block: {
          type: string;
          content: string;
          metadata?: Record<string, unknown>;
        };
        blockId: string;
      }> = [];

      const flushBuffer = () => {
        if (pendingBuffer) {
          accumulatedContent += pendingBuffer;

          // Update UI once per flush cycle
          setStreamingState((prev) => ({
            ...prev,
            currentStreamContent: accumulatedContent,
            // Pass block data if available
            blockData: hasBlockData ? blockBuffer : undefined,
          }));

          pendingBuffer = "";
        }
        flushTimer = null;
      };

      const scheduleFlush = () => {
        // Use nullish coalescing assignment to satisfy eslint rule
        flushTimer ??= setTimeout(flushBuffer, 50); // Slightly slower for block mode
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                // Flush any remaining buffered tokens before finishing
                if (flushTimer) {
                  clearTimeout(flushTimer);
                  flushTimer = null;
                }
                if (pendingBuffer) {
                  accumulatedContent += pendingBuffer;
                  pendingBuffer = "";
                }

                // Update the database with the final content
                if (accumulatedContent) {
                  await syncManager.updateMessage(
                    messageId,
                    accumulatedContent,
                  );
                }

                // For block mode, provide shorter grace period since blocks are already processed
                const gracePeriod =
                  enableBlockMode && hasBlockData
                    ? Math.min(accumulatedContent.length * 8, 2000) // Faster for block mode
                    : Math.min(
                        Math.max(accumulatedContent.length * 15, 1500),
                        6000,
                      ); // Legacy timing

                // Keep isStreaming true for a short grace period so the
                // Typewriter animation can flush the remaining queue.
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `[Streaming] Stream completed, setting grace period: ${gracePeriod}ms, hasBlockData: ${hasBlockData}, blocks: ${blockBuffer.length}`,
                  );
                }

                setStreamingState({
                  isStreaming: true,
                  currentStreamContent: accumulatedContent,
                  streamingMessageId: messageId,
                  blockData: hasBlockData ? [...blockBuffer] : undefined, // Preserve block data!
                  lastBlockDataMessageId: hasBlockData ? messageId : undefined, // Track which message has blocks
                });

                // After grace period mark stream truly finished
                setTimeout(() => {
                  if (process.env.NODE_ENV === "development") {
                    console.log(
                      `[Streaming] Grace period ended, finalizing stream with ${hasBlockData ? blockBuffer.length : 0} blocks`,
                    );
                  }
                  setStreamingState({
                    isStreaming: false,
                    currentStreamContent: accumulatedContent,
                    streamingMessageId: null,
                    blockData: hasBlockData ? [...blockBuffer] : undefined, // Preserve block data!
                    lastBlockDataMessageId: hasBlockData
                      ? messageId
                      : undefined, // Keep tracking the message with blocks
                  });
                }, gracePeriod);
                return;
              }

              try {
                const parsed = JSON.parse(data) as {
                  content?: string;
                  isComplete?: boolean;
                  block?: {
                    type: string;
                    content: string;
                    metadata?: Record<string, unknown>;
                  };
                  blockId?: string; // Block identifier
                };
                if (parsed.content) {
                  // Check if this is block-aware content
                  if (parsed.block && parsed.blockId) {
                    hasBlockData = true;

                    // Find existing block or create new one
                    const existingBlockIndex = blockBuffer.findIndex(
                      (b) => b.blockId === parsed.blockId,
                    );

                    if (existingBlockIndex !== -1) {
                      // Update existing block content
                      blockBuffer[existingBlockIndex]!.content = parsed.content;
                    } else {
                      // Add new block
                      blockBuffer.push({
                        content: parsed.content,
                        block: parsed.block,
                        blockId: parsed.blockId,
                      });
                    }

                    // For block mode, don't concatenate blocks - let BlockAwareTypewriter handle them
                    // The blocks will be displayed individually, not as concatenated content
                    // Just use empty string since BlockAwareTypewriter handles rendering
                    accumulatedContent = "";

                    if (process.env.NODE_ENV === "development") {
                      console.log(
                        `[Streaming] Updated block ${parsed.blockId}, total blocks: ${blockBuffer.length}`,
                      );
                    }

                    setStreamingState((prev) => ({
                      ...prev,
                      currentStreamContent: accumulatedContent,
                      blockData: [...blockBuffer], // Always pass current block state
                    }));
                  } else {
                    // Legacy character-by-character mode
                    pendingBuffer += parsed.content;
                    scheduleFlush();
                  }
                }
              } catch {
                // Skip invalid JSON
                console.warn("Invalid JSON in stream:", data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Stream completed - flush remaining buffer and update DB/UI
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (pendingBuffer) {
        accumulatedContent += pendingBuffer;
        pendingBuffer = "";
        setStreamingState((prev) => ({
          ...prev,
          currentStreamContent: accumulatedContent,
          blockData: hasBlockData ? [...blockBuffer] : undefined, // Preserve block data!
        }));
      }

      if (accumulatedContent) {
        await syncManager.updateMessage(messageId, accumulatedContent);
      }

      // Don't set final state here - let the setTimeout handle it to avoid race conditions
      // This was causing blockData to be overwritten
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Streaming] Stream processing complete, letting grace period handle final state`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Streaming error:", error);
      }

      setStreamingState({
        isStreaming: false,
        currentStreamContent: "",
        streamingMessageId: null,
        blockData: undefined, // Clear block data on streaming error
        lastBlockDataMessageId: undefined, // Clear block data tracking
      });
    }
  };

  const handleStop = async () => {
    if (!currentChatId) return;

    // Abort the current stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Add a system message about stopping
    await syncManager.createMessage(
      currentChatId,
      "system",
      "Response generation stopped by user.",
    );

    // Reset streaming state
    setStreamingState({
      isStreaming: false,
      currentStreamContent: "",
      streamingMessageId: null,
      blockData: undefined, // Clear block data when stopped
      lastBlockDataMessageId: undefined, // Clear block data tracking
    });
  };

  return {
    isTyping: streamingState.isStreaming,
    isStreaming: streamingState.isStreaming,
    currentStreamContent: streamingState.currentStreamContent,
    streamingMessageId: streamingState.streamingMessageId,
    blockData: streamingState.blockData,
    lastBlockDataMessageId: streamingState.lastBlockDataMessageId,
    generateResponseIsPending: generateResponse.isPending,
    handleSubmit,
    handleStop,
  };
}
