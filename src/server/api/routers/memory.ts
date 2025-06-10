import { z } from "zod";
import { memoryManagerServer } from "~/lib/memory/memoryManager-server";
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
      await memoryManagerServer.addMemory(
        input.chatId,
        input.content,
        input.metadata,
      );
      return { success: true };
    }),

  summarizeHistory: publicProcedure
    .input(z.object({ chatId: z.string(), history: z.string() }))
    .mutation(async ({ input }) => {
      const summary = await memoryManagerServer.summarizeAndStore(
        input.chatId,
        input.history,
      );
      return { success: true, summary };
    }),
});
