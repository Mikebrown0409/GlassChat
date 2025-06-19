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
}

export function useChatGenerationStreaming(
  currentChatId: string | undefined,
  messages: Message[],
  selectedModel: string,
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
      });
    }
  };

  const startHttpStreaming = async (
    model: AIModel,
    messages: Array<{ role: string; content: string }>,
    messageId: string,
  ) => {
    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
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
                // Update the database with the final content
                if (accumulatedContent) {
                  await syncManager.updateMessage(
                    messageId,
                    accumulatedContent,
                  );
                }

                setStreamingState({
                  isStreaming: false,
                  currentStreamContent: "",
                  streamingMessageId: null,
                });
                return;
              }

              try {
                const parsed = JSON.parse(data) as {
                  content?: string;
                  isComplete?: boolean;
                };
                if (parsed.content) {
                  accumulatedContent += parsed.content;

                  // Only update the UI state during streaming
                  // Don't update the database until streaming is complete
                  setStreamingState((prev) => ({
                    ...prev,
                    currentStreamContent: accumulatedContent,
                  }));
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

      // Stream completed - update the database with final content
      if (accumulatedContent) {
        await syncManager.updateMessage(messageId, accumulatedContent);
      }

      setStreamingState({
        isStreaming: false,
        currentStreamContent: "",
        streamingMessageId: null,
      });
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
    });
  };

  return {
    isTyping: streamingState.isStreaming,
    isStreaming: streamingState.isStreaming,
    currentStreamContent: streamingState.currentStreamContent,
    streamingMessageId: streamingState.streamingMessageId,
    generateResponseIsPending: generateResponse.isPending,
    handleSubmit,
    handleStop,
  };
}
