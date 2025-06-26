import { useRef, useState } from "react";
import { AIModel } from "~/lib/ai/types";
import { useMemory } from "~/lib/memory/hooks";
import { syncManager } from "~/lib/sync";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamingState {
  isStreaming: boolean;
  streamingContent: string; // accumulated content
  streamingMessageId: string | null;
}

/**
 * Unified Streaming Hook - Simplified ChatGPT-style streaming
 *
 * Key principles:
 * - Direct token streaming without complex buffering
 * - Consistent delivery timing
 * - Simple state management
 * - No block pre-processing
 */
export function useUnifiedStreaming(
  currentChatId: string | undefined,
  messages: Message[],
  selectedModel: string,
) {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingContent: "",
    streamingMessageId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  // Remove throttling for immediate UI responsiveness - especially critical for OpenAI
  const setStreamingStateImmediate = setStreamingState;

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
      setStreamingStateImmediate({
        isStreaming: true,
        streamingContent: "",
        streamingMessageId: assistantMessage.id,
      });

      // Create abort controller for this stream
      abortControllerRef.current = new AbortController();

      // Start simplified HTTP streaming
      await startStreaming(aiModel, preparedMessages, assistantMessage.id);
    } catch (err) {
      console.error("Failed to send message:", err);
      await syncManager.createMessage(
        currentChatId,
        "system",
        "Sorry, I encountered an error while processing your message. Please try again.",
      );
      setStreamingStateImmediate({
        isStreaming: false,
        streamingContent: "",
        streamingMessageId: null,
      });
    }
  };

  const startStreaming = async (
    model: AIModel,
    messages: Array<{ role: string; content: string }>,
    messageId: string,
  ) => {
    const totalContent = messages.map((m) => m.content).join("\n");
    const MAX_GENERATED_CHARS = 16000;
    if (totalContent.length > MAX_GENERATED_CHARS) {
      console.warn("Prompt too long, truncating for safety");
      messages = [
        {
          role: "system",
          content:
            "Previous context truncated for length. Reply concisely from now on.",
        },
        ...messages.slice(-10),
      ];
    }

    try {
      // For OpenAI models, use passthrough mode to avoid server-side delays
      const isOpenAIModel =
        model === AIModel.GPT_4O_MINI || model === AIModel.GPT_4_TURBO;
      const requestBody = {
        model,
        messages,
        blockAware: !isOpenAIModel, // Disable block processing for OpenAI
        streamMode: isOpenAIModel ? "passthrough" : "simple",
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[UnifiedStreaming] Starting block-aware stream (simple)");
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
                // Stream completed - update database with final content
                const finalContent = accumulatedContent;

                if (finalContent) {
                  await syncManager.updateMessage(messageId, finalContent);
                }

                // Mark streaming as finished - keep content and messageId for typewriter
                setStreamingStateImmediate({
                  isStreaming: false,
                  streamingContent: finalContent,
                  streamingMessageId: messageId,
                });

                if (process.env.NODE_ENV === "development") {
                  console.log("[UnifiedStreaming] Stream completed naturally", {
                    finalContentLength: finalContent.length,
                    isStreaming: false,
                    messageId,
                    preview: finalContent.slice(0, 50) + "...",
                  });
                }
                return;
              }

              try {
                const parsed = JSON.parse(data) as {
                  content?: string;
                  block?: {
                    type: string;
                    content: string;
                    metadata?: Record<string, unknown>;
                  };
                  blockId?: string;
                };

                if (parsed.content) {
                  accumulatedContent += parsed.content;

                  setStreamingStateImmediate({
                    isStreaming: true,
                    streamingContent: accumulatedContent,
                    streamingMessageId: messageId,
                  });
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

      // Final cleanup if stream ends without [DONE]
      const finalContent = accumulatedContent;

      if (finalContent) {
        await syncManager.updateMessage(messageId, finalContent);
      }

      setStreamingStateImmediate({
        isStreaming: false,
        streamingContent: finalContent,
        streamingMessageId: messageId,
      });

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[UnifiedStreaming] Stream ended without [DONE], setting isStreaming: false",
          {
            finalContentLength: finalContent.length,
            messageId,
          },
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Streaming error:", error);
      }

      setStreamingStateImmediate({
        isStreaming: false,
        streamingContent: "",
        streamingMessageId: null,
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
    setStreamingStateImmediate({
      isStreaming: false,
      streamingContent: "",
      streamingMessageId: null,
    });
  };

  const clearStreamingState = () => {
    setStreamingStateImmediate({
      isStreaming: false,
      streamingContent: "",
      streamingMessageId: null,
    });
  };

  return {
    isTyping: streamingState.isStreaming,
    isStreaming: streamingState.isStreaming,
    streamingContent: streamingState.streamingContent,
    streamingMessageId: streamingState.streamingMessageId,
    handleSubmit,
    handleStop,
    clearStreamingState,
  };
}
