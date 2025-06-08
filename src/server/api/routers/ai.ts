// tRPC AI Router - Type-safe API endpoints for AI integration
// Provides chat completions, streaming, and model management

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  aiModels,
  generateAIResponse,
  generateAIStream,
} from "~/lib/ai/models";
import {
  AIModel,
  AIProvider,
  type AIMessage,
  type AIResponse,
  type AIStreamChunk,
  type AIError,
  AI_MODEL_INFO,
} from "~/lib/ai/types";

// Input validation schemas
const AIMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
  timestamp: z.number().optional(),
});

const ChatCompletionSchema = z.object({
  model: z.nativeEnum(AIModel),
  messages: z.array(AIMessageSchema).min(1).max(100),
  config: z
    .object({
      maxTokens: z.number().min(1).max(8192).optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
    })
    .optional(),
});

const StreamingChatSchema = ChatCompletionSchema.extend({
  onChunk: z
    .function()
    .args(
      z.object({
        content: z.string(),
        isComplete: z.boolean(),
      }),
    )
    .returns(z.void())
    .optional(),
});

export const aiRouter = createTRPCRouter({
  // Get available AI models with their information
  getModels: publicProcedure.query(async () => {
    try {
      const models = aiModels.getAvailableModels();
      return {
        success: true,
        models: models.map(({ model, info }) => ({
          ...info,
          isAvailable: aiModels.isModelAvailable(model),
        })),
      };
    } catch (error) {
      console.error("Error fetching models:", error);
      return {
        success: false,
        error: "Failed to fetch available models",
        models: [],
      };
    }
  }),

  // Check if a specific model is available
  isModelAvailable: publicProcedure
    .input(
      z.object({
        model: z.nativeEnum(AIModel),
      }),
    )
    .query(async ({ input }) => {
      try {
        const isAvailable = aiModels.isModelAvailable(input.model);
        const modelInfo = AI_MODEL_INFO[input.model];

        return {
          success: true,
          model: input.model,
          isAvailable,
          info: modelInfo,
        };
      } catch (error) {
        console.error("Error checking model availability:", error);
        return {
          success: false,
          model: input.model,
          isAvailable: false,
          error: "Failed to check model availability",
        };
      }
    }),

  // Generate a single AI response
  generateResponse: publicProcedure.input(ChatCompletionSchema).mutation(
    async ({
      input,
    }): Promise<{
      success: boolean;
      response?: AIResponse;
      error?: string;
      errorType?: AIError["type"];
    }> => {
      try {
        const response = await generateAIResponse(
          input.model,
          input.messages,
          input.config,
        );

        return {
          success: true,
          response,
        };
      } catch (error) {
        console.error("AI generation error:", error);

        if (error && typeof error === "object" && "type" in error) {
          const aiError = error as AIError;
          return {
            success: false,
            error: aiError.message,
            errorType: aiError.type,
          };
        }

        return {
          success: false,
          error: "Failed to generate AI response",
          errorType: "unknown",
        };
      }
    },
  ),

  // Generate streaming AI response
  generateStream: publicProcedure
    .input(ChatCompletionSchema)
    .subscription(async function* ({ input }) {
      try {
        const stream = await generateAIStream(
          input.model,
          input.messages,
          input.config,
        );

        for await (const chunk of stream) {
          yield {
            success: true,
            chunk,
          };
        }
      } catch (error) {
        console.error("AI streaming error:", error);

        if (error && typeof error === "object" && "type" in error) {
          const aiError = error as AIError;
          yield {
            success: false,
            error: aiError.message,
            errorType: aiError.type,
          };
        } else {
          yield {
            success: false,
            error: "Failed to generate streaming response",
            errorType: "unknown" as const,
          };
        }
      }
    }),

  // Get rate limit information for providers
  getRateLimits: publicProcedure
    .input(
      z.object({
        provider: z.nativeEnum(AIProvider).optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        if (input.provider) {
          const rateLimitInfo = aiModels.getRateLimitInfo(input.provider);
          return {
            success: true,
            rateLimits: { [input.provider]: rateLimitInfo },
          };
        }

        // Get rate limits for all providers
        const rateLimits = Object.values(AIProvider).reduce(
          (acc, provider) => {
            acc[provider] = aiModels.getRateLimitInfo(provider);
            return acc;
          },
          {} as Record<
            AIProvider,
            ReturnType<typeof aiModels.getRateLimitInfo>
          >,
        );

        return {
          success: true,
          rateLimits,
        };
      } catch (error) {
        console.error("Error fetching rate limits:", error);
        return {
          success: false,
          error: "Failed to fetch rate limit information",
          rateLimits: {},
        };
      }
    }),

  // Test AI connection with a simple prompt
  testConnection: publicProcedure
    .input(
      z.object({
        model: z.nativeEnum(AIModel),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const testMessages: AIMessage[] = [
          {
            role: "user",
            content:
              "Hello! Please respond with a brief greeting to test the connection.",
          },
        ];

        const response = await generateAIResponse(input.model, testMessages, {
          maxTokens: 50,
          temperature: 0.1,
        });

        return {
          success: true,
          model: input.model,
          response: response.content,
          responseTime: response.responseTime,
          tokensUsed: response.usage.totalTokens,
        };
      } catch (error) {
        console.error("AI connection test error:", error);

        if (error && typeof error === "object" && "type" in error) {
          const aiError = error as AIError;
          return {
            success: false,
            model: input.model,
            error: aiError.message,
            errorType: aiError.type,
          };
        }

        return {
          success: false,
          model: input.model,
          error: "Connection test failed",
          errorType: "unknown" as const,
        };
      }
    }),

  // Get model usage statistics (mock implementation)
  getUsageStats: publicProcedure
    .input(
      z.object({
        provider: z.nativeEnum(AIProvider).optional(),
        timeframe: z.enum(["hour", "day", "week", "month"]).default("day"),
      }),
    )
    .query(async ({ input }) => {
      try {
        // This would typically fetch from a database
        // For now, return mock statistics
        const mockStats = {
          provider: input.provider || AIProvider.OPENAI,
          timeframe: input.timeframe,
          requests: Math.floor(Math.random() * 1000),
          tokensUsed: Math.floor(Math.random() * 100000),
          errors: Math.floor(Math.random() * 10),
          averageResponseTime: Math.floor(Math.random() * 2000) + 500,
          costEstimate: (Math.random() * 10).toFixed(2),
        };

        return {
          success: true,
          stats: mockStats,
        };
      } catch (error) {
        console.error("Error fetching usage stats:", error);
        return {
          success: false,
          error: "Failed to fetch usage statistics",
        };
      }
    }),

  // Health check for AI services
  healthCheck: publicProcedure.query(async () => {
    try {
      const models = aiModels.getAvailableModels();
      const availableModels = models.filter(({ model }) =>
        aiModels.isModelAvailable(model),
      );

      const providerStatus = Object.values(AIProvider).map((provider) => {
        const rateLimitInfo = aiModels.getRateLimitInfo(provider);
        return {
          provider,
          status:
            rateLimitInfo.requestsRemaining > 0 ? "healthy" : "rate_limited",
          requestsRemaining: rateLimitInfo.requestsRemaining,
          resetTime: rateLimitInfo.resetTime,
        };
      });

      return {
        success: true,
        status: "healthy",
        availableModels: availableModels.length,
        totalModels: models.length,
        providers: providerStatus,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Health check error:", error);
      return {
        success: false,
        status: "unhealthy",
        error: "Health check failed",
        timestamp: Date.now(),
      };
    }
  }),
});
