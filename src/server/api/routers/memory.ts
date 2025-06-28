import { z } from "zod";
import { memoryManager } from "~/lib/memory/memoryManager-server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const memoryRouter = createTRPCRouter({
  addMemory: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        content: z.string(),
        metadata: z.record(z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      await memoryManager.addMemory(
        input.chatId,
        input.content,
        input.metadata,
      );
      return { success: true };
    }),

  summarizeHistory: publicProcedure
    .input(z.object({ chatId: z.string(), history: z.string() }))
    .mutation(async ({ input }) => {
      const summary = await memoryManager.summarizeAndStore(
        input.chatId,
        input.history,
      );
      return { success: true, summary };
    }),
});
