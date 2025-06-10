import { GoogleGenerativeAI } from "@google/generative-ai";
import { type Prisma } from "@prisma/client";
import { env } from "~/env";
import { db } from "~/server/db";
import type { SmartSummary } from "~/types/memory";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY);

class MemoryManagerServer {
  async getEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async addMemory(
    chatId: string,
    content: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    // We are not generating or storing embeddings for now to simplify the feature.
    // const embedding = await this.getEmbedding(content);

    try {
      await db.memoryEntry.create({
        data: {
          chatId,
          content,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error("Failed to create memory entry:", error);
      throw new Error("Failed to create memory entry in database.");
    }

    // This is where you would also trigger a re-summarization if needed.
    // For example, after every 5-10 new memories.
  }

  async generateSummary(
    chatHistory: string,
  ): Promise<{ summary: string; keywords: string[] }> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Based on the following chat history, provide a concise one-paragraph summary and a list of up to 5 main keywords (as a comma-separated list).

Chat History:
---
${chatHistory}
---

Output format should be:
Summary: [Your summary here]
Keywords: [keyword1, keyword2, keyword3]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const summaryMatch = /Summary: (.*)/.exec(text);
    const keywordsMatch = /Keywords: (.*)/.exec(text);

    const summary = summaryMatch?.[1]?.trim() ?? "Could not generate summary.";
    const keywords = keywordsMatch?.[1]?.split(",").map((k) => k.trim()) ?? [];

    return { summary, keywords };
  }

  async summarizeAndStore(
    chatId: string,
    chatHistory: string,
  ): Promise<SmartSummary> {
    const { summary, keywords } = await this.generateSummary(chatHistory);

    const newSummary = await db.smartSummary.upsert({
      where: { chatId },
      update: { summary, keywords: keywords.join(","), createdAt: new Date() },
      create: { chatId, summary, keywords: keywords.join(",") },
    });

    // The 'keywords' field is a string in the DB, but we want to return a string[]
    return {
      ...newSummary,
      keywords: newSummary.keywords.split(","),
      createdAt: newSummary.createdAt.getTime(),
    };
  }
}

export const memoryManagerServer = new MemoryManagerServer();
