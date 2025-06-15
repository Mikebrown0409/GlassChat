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
) {
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Gemini 2.0 Flash");

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
        "Gemini 2.0 Flash": AIModel.GEMINI_2_0_FLASH,
        "GPT-4 Turbo": AIModel.GPT_4_TURBO,
        "Claude 3": AIModel.CLAUDE_3_SONNET,
      };
      const aiModel = map[selectedModel] ?? AIModel.GEMINI_2_0_FLASH;

      const systemPrompt = `You are a helpful, clear, and professional AI assistant integrated into a chat-based interface.\n\nFollow these RESPONSE STYLE GUIDELINES for **every** reply unless explicitly instructed otherwise:\n1. **Structure & Formatting**\n   • Start with bold section headings (e.g., **Overview**, **Step-by-Step**).\n   • Use numbered lists for processes, bullets for unordered data, and Markdown tables for comparisons or timelines.\n   • Insert blank lines between paragraphs/sections for readability.\n2. **Visual Hierarchy**\n   • Bold section headers; *italicize* emphasis sparingly.\n   • Use \`inline code\` for commands or variables.\n   • Keep paragraphs ≤ 4 lines.\n3. **Tables**\n   • Include bold header rows.\n   • Ensure columns are aligned and tables are not split across multiple code blocks.\n4. **Tone & Readability**\n   • Friendly yet professional, no fluff.\n   • Break down complex topics into plain English first, then dive deeper.\n   • End with a ✅ **Summary** section when appropriate.\n5. **Conversation Memory**\n   • Reference prior context and maintain continuity.\n6. **Optional Enhancements**\n   • Emojis (📌, ✅) only when they add clarity.\n   • Collapsible sections if supported.\n\nAlways apply these rules while answering based on the provided message history.`;

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
    selectedModel,
    setSelectedModel,
    generateResponseIsPending: generateResponse.isPending,
    handleSubmit,
    handleStop,
  };
}
