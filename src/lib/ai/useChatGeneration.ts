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

      const systemPrompt = `You are a helpful AI assistant with a perfect memory of the conversation so far.\nYour task is to continue the chat. Use the provided message history to answer questions and maintain context.\nBe helpful and engaging.`;

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
