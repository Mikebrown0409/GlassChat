import { GoogleGenerativeAI } from "@google/generative-ai";
import { type MemoryEntry, type Prisma } from "@prisma/client";
import { env } from "~/env";
import { db } from "~/server/db";
import type { SmartSummary } from "~/types/memory";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY);

class MemoryManagerServer {
  // Memory retention configuration
  private readonly MAX_MEMORIES_PER_CHAT = 100; // Keep last 100 memories
  private readonly MEMORY_RETENTION_DAYS = 90; // Keep memories for 90 days
  private readonly CLEANUP_BATCH_SIZE = 50; // Process cleanup in batches

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

      // Trigger cleanup after adding new memory to prevent bloat
      await this.cleanupOldMemories(chatId);
    } catch (error: unknown) {
      console.error("Failed to create memory entry:", error);
      throw new Error("Failed to create memory entry in database.");
    }

    // This is where you would also trigger a re-summarization if needed.
    // For example, after every 5-10 new memories.
  }

  /**
   * Intelligent memory cleanup that preserves important memories while removing old/redundant ones
   */
  async cleanupOldMemories(chatId: string): Promise<void> {
    try {
      // Get memory count for this chat
      const memoryCount: number = await db.memoryEntry.count({
        where: { chatId },
      });

      // Only cleanup if we exceed the limit
      if (memoryCount <= this.MAX_MEMORIES_PER_CHAT) {
        return;
      }

      console.log(
        `🧹 Cleaning up memories for chat ${chatId} (${memoryCount} entries)`,
      );

      // Strategy 1: Remove memories older than retention period
      const cutoffDate = new Date(
        Date.now() - this.MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const deletedOld: Prisma.BatchPayload = await db.memoryEntry.deleteMany({
        where: {
          chatId,
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      console.log(
        `🗑️ Deleted ${deletedOld.count} old memories (older than ${this.MEMORY_RETENTION_DAYS} days)`,
      );

      // Strategy 2: If still over limit, keep only the most recent memories
      const remainingCount: number = await db.memoryEntry.count({
        where: { chatId },
      });

      if (remainingCount > this.MAX_MEMORIES_PER_CHAT) {
        // Get IDs of memories to keep (most recent ones)
        const memoriesToKeep: Pick<MemoryEntry, "id">[] =
          await db.memoryEntry.findMany({
            where: { chatId },
            select: { id: true },
            orderBy: { timestamp: "desc" },
            take: this.MAX_MEMORIES_PER_CHAT,
          });

        const keepIds = memoriesToKeep.map((m) => m.id);

        // Delete memories not in the keep list
        const deletedExcess: Prisma.BatchPayload =
          await db.memoryEntry.deleteMany({
            where: {
              chatId,
              id: {
                notIn: keepIds,
              },
            },
          });

        console.log(
          `🗑️ Deleted ${deletedExcess.count} excess memories (keeping ${this.MAX_MEMORIES_PER_CHAT} most recent)`,
        );
      }

      // Update summary after cleanup to ensure it reflects current state
      const recentMemories: MemoryEntry[] = await db.memoryEntry.findMany({
        where: { chatId },
        orderBy: { timestamp: "desc" },
        take: 20, // Use last 20 memories for summary
      });

      if (recentMemories.length > 0) {
        const historyString = recentMemories
          .reverse() // Chronological order
          .map((m) => {
            const role = (m.metadata as { role?: string })?.role ?? "user";
            return `${role}: ${m.content}`;
          })
          .join("\n");

        await this.summarizeAndStore(chatId, historyString);
        console.log(`📝 Updated summary after memory cleanup`);
      }
    } catch (error: unknown) {
      console.error(`Failed to cleanup memories for chat ${chatId}:`, error);
      // Don't throw - cleanup failure shouldn't break memory addition
    }
  }

  /**
   * Bulk cleanup for maintenance - can be run as a scheduled job
   */
  async performGlobalMemoryCleanup(): Promise<void> {
    console.log("🧹 Starting global memory cleanup...");

    try {
      // Get all unique chat IDs
      const chatIds: Pick<MemoryEntry, "chatId">[] =
        await db.memoryEntry.findMany({
          select: { chatId: true },
          distinct: ["chatId"],
        });

      console.log(`Found ${chatIds.length} chats with memories`);

      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < chatIds.length; i += this.CLEANUP_BATCH_SIZE) {
        const batch = chatIds.slice(i, i + this.CLEANUP_BATCH_SIZE);

        await Promise.all(
          batch.map(({ chatId }) => this.cleanupOldMemories(chatId)),
        );

        console.log(
          `Processed batch ${Math.floor(i / this.CLEANUP_BATCH_SIZE) + 1}/${Math.ceil(chatIds.length / this.CLEANUP_BATCH_SIZE)}`,
        );

        // Small delay to prevent database overload
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("✅ Global memory cleanup completed");
    } catch (error: unknown) {
      console.error("❌ Global memory cleanup failed:", error);
    }
  }

  async generateSummary(
    chatHistory: string,
  ): Promise<{ summary: string; keywords: string[] }> {
    try {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.warn(
          "Google AI API key not configured, skipping summary generation",
        );
        return {
          summary: "Summary generation unavailable - API key not configured",
          keywords: ["chat", "conversation"],
        };
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite-preview-06-17",
      });

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

      const summary =
        summaryMatch?.[1]?.trim() ?? "Could not generate summary.";
      const keywords =
        keywordsMatch?.[1]?.split(",").map((k) => k.trim()) ?? [];

      return { summary, keywords };
    } catch (error: unknown) {
      console.error("Failed to generate summary:", error);
      return {
        summary: "Error generating summary - please try again later",
        keywords: ["error", "chat", "conversation"],
      };
    }
  }

  async summarizeAndStore(
    chatId: string,
    chatHistory: string,
  ): Promise<SmartSummary> {
    const { summary, keywords } = await this.generateSummary(chatHistory);

    try {
      const existingSummary = await db.smartSummary.findUnique({
        where: { chatId },
      });

      if (existingSummary) {
        const updatedSummary = await db.smartSummary.update({
          where: { chatId },
          data: {
            summary,
            keywords: keywords.join(", "),
          },
        });

        return {
          id: updatedSummary.id,
          chatId: updatedSummary.chatId,
          summary: updatedSummary.summary,
          keywords: updatedSummary.keywords.split(", "),
          createdAt: updatedSummary.createdAt.getTime(),
        };
      } else {
        const newSummary = await db.smartSummary.create({
          data: {
            chatId,
            summary,
            keywords: keywords.join(", "),
          },
        });

        return {
          id: newSummary.id,
          chatId: newSummary.chatId,
          summary: newSummary.summary,
          keywords: newSummary.keywords.split(", "),
          createdAt: newSummary.createdAt.getTime(),
        };
      }
    } catch (error: unknown) {
      console.error("Failed to store summary:", error);
      throw new Error("Failed to store summary in database.");
    }
  }
}

export const memoryManager = new MemoryManagerServer();
