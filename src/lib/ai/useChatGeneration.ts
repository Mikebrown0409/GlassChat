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

export function useChatGeneration(
  currentChatId: string | undefined,
  messages: Message[],
  selectedModel: string,
) {
  const [isTyping, setIsTyping] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const memory = useMemory(currentChatId ?? null, messages);

  const generateResponse = api.ai.generateResponse.useMutation();
  const generateTitle = api.ai.generateResponse.useMutation();

  const handleSubmit = async (userInput: string, clearInput: () => void) => {
    if (!userInput.trim() || !currentChatId || isTyping) return;
    const userMessage = userInput.trim();
    clearInput();
    setIsTyping(true);

    try {
      await syncManager.createMessage(currentChatId, "user", userMessage);
      await memory.addMemory(userMessage, { role: "user" });

      const map: Record<string, AIModel> = {
        "gemini-2.5-flash-lite-preview-06-17": AIModel.GEMINI_2_5_FLASH_LITE,
        "gpt-4o-mini": AIModel.GPT_4O_MINI,
        "gpt-4-turbo": AIModel.GPT_4_TURBO,
        "claude-3-sonnet-20240229": AIModel.CLAUDE_3_SONNET,
      };
      const aiModel = map[selectedModel] ?? AIModel.GEMINI_2_5_FLASH_LITE;

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

      const response = await generateResponse.mutateAsync({
        model: aiModel,
        messages: preparedMessages,
      });

      if (response.success && response.response?.content) {
        const assistantContent = response.response.content;
        await syncManager.createMessage(
          currentChatId,
          "assistant",
          assistantContent,
        );
        await memory.addMemory(assistantContent, {
          role: "assistant",
        });

        // --- Smart Chat Title Generation ---------------------------------
        try {
          // Dynamically import db only when needed to minimise bundle size
          const { db } = await import("~/lib/db");
          const chat = await db.chats.get(currentChatId);

          if (chat && chat.title === "New Conversation") {
            // Construct a prompt that asks the AI to create a short title
            const titlePrompt =
              "You are an advanced AI that names chat conversations succinctly. " +
              "Given the following conversation, generate an engaging title in 3-6 words, in Title Case, without any quotation marks or trailing punctuation. Respond with ONLY the title.";

            // Use the latest few messages to give context
            const contextMessages = [
              ...messagesRef.current.slice(-6).map((m) => ({
                role: m.role,
                content: m.content,
              })),
              { role: "user" as const, content: userMessage },
              { role: "assistant" as const, content: assistantContent },
            ];

            const titleResponse = await generateTitle.mutateAsync({
              model: aiModel,
              messages: [
                { role: "system" as const, content: titlePrompt },
                ...contextMessages,
              ],
            });

            const rawTitle =
              titleResponse.success && titleResponse.response?.content
                ? titleResponse.response.content.trim()
                : "";

            // Sanitise the returned title
            const cleanedTitle = rawTitle
              .replace(/^['"\s]+|['"\s]+$/g, "") // remove quotes & surrounding whitespace
              .replace(/\.$/, "") // remove trailing period
              .slice(0, 100); // safety limit

            let finalTitle = cleanedTitle;

            // Fallback: derive a title from the user message if AI failed
            if (
              !finalTitle ||
              finalTitle.toLowerCase() === "new conversation"
            ) {
              const deriveFromText = (text: string) => {
                // Take first 6 significant words, strip punctuation, Title Case
                const words = text
                  .replace(/[^\w\s]/g, " ")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 6);
                const titleCased = words
                  .map(
                    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                  )
                  .join(" ");
                return titleCased || "Conversation";
              };

              finalTitle = deriveFromText(userMessage);
            }

            // Only update if different from current title
            if (finalTitle && finalTitle !== chat.title) {
              await syncManager.updateChat(currentChatId, {
                title: finalTitle,
              });
            }
          }
        } catch (titleErr) {
          console.error("Failed to generate chat title", titleErr);
        }
      } else {
        await syncManager.createMessage(
          currentChatId,
          "system",
          "Sorry, I encountered an error while processing your message. Please try again.",
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      await syncManager.createMessage(
        currentChatId,
        "system",
        "Sorry, I encountered an error while processing your message. Please try again.",
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleStop = async () => {
    if (!currentChatId) return;
    await syncManager.createMessage(
      currentChatId,
      "system",
      "Response generation stopped by user.",
    );
    setIsTyping(false);
  };

  return {
    isTyping,
    generateResponseIsPending: generateResponse.isPending,
    handleSubmit,
    handleStop,
  };
}
