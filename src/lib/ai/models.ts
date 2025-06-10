// AI Models System - Dynamic Multi-Provider Integration
// Handles OpenAI and Anthropic APIs with error handling and rate limiting

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "~/env";
import { rateLimiter, waitWithBackoff } from "./rate-limiter";
import {
  AI_MODEL_INFO,
  AIModel,
  AIProvider,
  DEFAULT_MODEL_CONFIGS,
  type AIError,
  type AIMessage,
  type AIModelConfig,
  type AIResponse,
  type AIStreamChunk,
} from "./types";

// Mock responses for testing when API keys are not available
const MOCK_RESPONSES: Record<AIModel, string> = {
  [AIModel.GPT_4]:
    "I'm a mock GPT-4 response. This would normally connect to OpenAI's API.",
  [AIModel.GPT_4_TURBO]:
    "I'm a mock GPT-4 Turbo response. This would normally connect to OpenAI's API.",
  [AIModel.GPT_3_5_TURBO]:
    "I'm a mock GPT-3.5 Turbo response. This would normally connect to OpenAI's API.",
  [AIModel.CLAUDE_3_OPUS]:
    "I'm a mock Claude 3 Opus response. This would normally connect to Anthropic's API.",
  [AIModel.CLAUDE_3_SONNET]:
    "I'm a mock Claude 3 Sonnet response. This would normally connect to Anthropic's API.",
  [AIModel.CLAUDE_3_HAIKU]:
    "I'm a mock Claude 3 Haiku response. This would normally connect to Anthropic's API.",
  [AIModel.GEMINI_2_0_FLASH]:
    "I'm a mock Gemini 2.0 Flash response. This would normally connect to Google's API.",
  [AIModel.GEMINI_1_5_FLASH]:
    "I'm a mock Gemini 1.5 Flash response. This would normally connect to Google's API.",
  [AIModel.GEMINI_1_5_PRO]:
    "I'm a mock Gemini 1.5 Pro response. This would normally connect to Google's API.",
};

class AIModelManager {
  private retryAttempts = 3;
  private mockMode = false;

  constructor() {
    // Enable mock mode if no API keys are available
    this.mockMode =
      !env.OPENAI_API_KEY &&
      !env.ANTHROPIC_API_KEY &&
      !env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (this.mockMode) {
      console.warn("🤖 AI Mock Mode: No API keys found, using mock responses");
    } else {
      console.log("🔑 AI Real Mode: API keys detected");
    }
  }

  async generateResponse(
    model: AIModel,
    messages: AIMessage[],
    config?: Partial<AIModelConfig>,
    stream?: boolean,
  ): Promise<AIResponse | AsyncGenerator<AIStreamChunk>> {
    const startTime = Date.now();
    const modelConfig = { ...DEFAULT_MODEL_CONFIGS[model], ...config };
    const provider = modelConfig.provider;

    // Estimate tokens for rate limiting
    const estimatedTokens = this.estimateTokens(messages);

    // Check rate limits
    const rateLimitCheck = await rateLimiter.checkRateLimit(
      provider,
      estimatedTokens,
    );
    if (!rateLimitCheck.allowed) {
      throw this.createError(
        "rate_limit",
        `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        provider,
        rateLimitCheck.retryAfter,
      );
    }

    // Attempt request with retries
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        if (this.mockMode) {
          return await this.generateMockResponse(model, messages, startTime);
        }

        if (stream) {
          return this.generateStreamingResponse(model, messages, modelConfig);
        } else {
          return await this.generateSingleResponse(
            model,
            messages,
            modelConfig,
            startTime,
          );
        }
      } catch (error) {
        const aiError = this.handleError(error, provider);

        // Don't retry for certain error types
        if (
          aiError.type === "api_key" ||
          aiError.type === "model_unavailable"
        ) {
          throw aiError;
        }

        // Handle rate limiting with exponential backoff
        if (aiError.type === "rate_limit") {
          if (attempt < this.retryAttempts - 1) {
            const { retryAfter } = rateLimiter.handleRateLimitResponse(
              provider,
              aiError.retryAfter?.toString(),
            );
            await waitWithBackoff(attempt, retryAfter * 1000);
            continue;
          }
        }

        // Exponential backoff for other errors
        if (attempt < this.retryAttempts - 1) {
          await waitWithBackoff(attempt);
          continue;
        }

        throw aiError;
      }
    }

    throw this.createError(
      "unknown",
      "Failed after maximum retry attempts",
      provider,
    );
  }

  private async generateSingleResponse(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
    startTime: number,
  ): Promise<AIResponse> {
    const provider = config.provider;

    if (provider === AIProvider.OPENAI) {
      return await this.callOpenAI(model, messages, config, startTime);
    } else if (provider === AIProvider.ANTHROPIC) {
      return await this.callAnthropic(model, messages, config, startTime);
    } else if (provider === AIProvider.GOOGLE) {
      return await this.callGoogle(model, messages, config, startTime);
    }

    throw this.createError(
      "model_unavailable",
      `Unsupported provider: ${provider}`,
      provider,
    );
  }

  private async *generateStreamingResponse(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
  ): AsyncGenerator<AIStreamChunk> {
    const provider = config.provider;

    if (provider === AIProvider.OPENAI) {
      yield* this.streamOpenAI(model, messages, config);
    } else if (provider === AIProvider.ANTHROPIC) {
      yield* this.streamAnthropic(model, messages, config);
    } else if (provider === AIProvider.GOOGLE) {
      yield* this.streamGoogle(model, messages, config);
    } else {
      throw this.createError(
        "model_unavailable",
        `Streaming not supported for provider: ${provider}`,
        provider,
      );
    }
  }

  private async callOpenAI(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
    startTime: number,
  ): Promise<AIResponse> {
    if (!env.OPENAI_API_KEY) {
      throw this.createError(
        "api_key",
        "OpenAI API key not configured",
        AIProvider.OPENAI,
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
      }),
    });

    if (!response.ok) {
      await this.handleHTTPError(response, AIProvider.OPENAI);
    }

    const data = (await response.json()) as any;
    const responseTime = Date.now() - startTime;

    // Record request for rate limiting
    rateLimiter.recordRequest(AIProvider.OPENAI, data.usage?.total_tokens || 0);

    return {
      content: data.choices[0]?.message?.content || "",
      model,
      provider: AIProvider.OPENAI,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: data.choices[0]?.finish_reason || "stop",
      responseTime,
    };
  }

  private async *streamOpenAI(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
  ): AsyncGenerator<AIStreamChunk> {
    if (!env.OPENAI_API_KEY) {
      throw this.createError(
        "api_key",
        "OpenAI API key not configured",
        AIProvider.OPENAI,
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      await this.handleHTTPError(response, AIProvider.OPENAI);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw this.createError(
        "network",
        "Failed to get response stream",
        AIProvider.OPENAI,
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", isComplete: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              yield { content, isComplete: false };
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callAnthropic(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
    startTime: number,
  ): Promise<AIResponse> {
    if (!env.ANTHROPIC_API_KEY) {
      throw this.createError(
        "api_key",
        "Anthropic API key not configured",
        AIProvider.ANTHROPIC,
      );
    }

    // Convert messages to Anthropic format
    const systemMessage =
      messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemMessage,
        messages: userMessages.map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      await this.handleHTTPError(response, AIProvider.ANTHROPIC);
    }

    const data = (await response.json()) as any;
    const responseTime = Date.now() - startTime;

    // Record request for rate limiting
    rateLimiter.recordRequest(
      AIProvider.ANTHROPIC,
      data.usage?.output_tokens || 0,
    );

    return {
      content: data.content[0]?.text || "",
      model,
      provider: AIProvider.ANTHROPIC,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.stop_reason || "stop",
      responseTime,
    };
  }

  private async *streamAnthropic(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
  ): AsyncGenerator<AIStreamChunk> {
    // Anthropic streaming implementation would go here
    // For now, fall back to single response
    const response = await this.callAnthropic(
      model,
      messages,
      config,
      Date.now(),
    );
    yield {
      content: response.content,
      isComplete: true,
      usage: response.usage,
    };
  }

  private async callGoogle(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
    startTime: number,
  ): Promise<AIResponse> {
    if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw this.createError(
        "api_key",
        "Google Generative AI API key not configured",
        AIProvider.GOOGLE,
      );
    }

    const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: model });

    try {
      // Extract system prompt and user/assistant messages
      const systemMessage = messages.find((msg) => msg.role === "system");
      const history = messages.filter((msg) => msg.role !== "system");

      // Convert messages to Gemini-compatible format
      const contents = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const result = await geminiModel.generateContent({
        contents: contents,
        systemInstruction: systemMessage
          ? {
              role: "system",
              parts: [{ text: systemMessage.content }],
            }
          : undefined,
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: config.temperature,
          topP: config.topP,
        },
      });

      const response = result.response;
      const text = response.text();
      const responseTime = Date.now() - startTime;

      rateLimiter.recordRequest(AIProvider.GOOGLE, text.length / 4);

      return {
        content: text,
        model,
        provider: AIProvider.GOOGLE,
        usage: {
          promptTokens: this.estimateTokens(messages),
          completionTokens: Math.ceil(text.length / 4),
          totalTokens:
            this.estimateTokens(messages) + Math.ceil(text.length / 4),
        },
        finishReason: "stop",
        responseTime,
      };
    } catch (error) {
      throw this.handleError(error, AIProvider.GOOGLE);
    }
  }

  private async *streamGoogle(
    model: AIModel,
    messages: AIMessage[],
    config: AIModelConfig,
  ): AsyncGenerator<AIStreamChunk> {
    // Google streaming implementation would go here
    // For now, fall back to single response
    const response = await this.callGoogle(model, messages, config, Date.now());
    yield {
      content: response.content,
      isComplete: true,
      usage: response.usage,
    };
  }

  private async generateMockResponse(
    model: AIModel,
    messages: AIMessage[],
    startTime: number,
  ): Promise<AIResponse> {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000),
    );

    const provider = DEFAULT_MODEL_CONFIGS[model].provider;
    const mockContent = MOCK_RESPONSES[model];
    const responseTime = Date.now() - startTime;

    return {
      content: mockContent,
      model,
      provider,
      usage: {
        promptTokens: this.estimateTokens(messages),
        completionTokens: mockContent.length / 4, // Rough estimate
        totalTokens: this.estimateTokens(messages) + mockContent.length / 4,
      },
      finishReason: "stop",
      responseTime,
    };
  }

  private estimateTokens(messages: AIMessage[]): number {
    // Rough token estimation (1 token ≈ 4 characters)
    return messages.reduce(
      (total, msg) => total + Math.ceil(msg.content.length / 4),
      0,
    );
  }

  private async handleHTTPError(
    response: Response,
    provider: AIProvider,
  ): Promise<void> {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw this.createError(
        "rate_limit",
        errorData.error?.message || "Rate limit exceeded",
        provider,
        retryAfter ? parseInt(retryAfter, 10) : undefined,
      );
    }

    if (response.status === 401) {
      throw this.createError("api_key", "Invalid API key", provider);
    }

    if (response.status >= 500) {
      throw this.createError(
        "network",
        `Server error: ${response.status}`,
        provider,
      );
    }

    throw this.createError(
      "unknown",
      errorData.error?.message || `HTTP ${response.status}`,
      provider,
    );
  }

  private handleError(error: unknown, provider: AIProvider): AIError {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      "code" in error &&
      "provider" in error
    ) {
      return error as AIError;
    }

    if (error instanceof Error) {
      return this.createError("network", error.message, provider);
    }

    return this.createError("unknown", "An unknown error occurred", provider);
  }

  private createError(
    type: AIError["type"],
    message: string,
    provider: AIProvider,
    retryAfter?: number,
  ): AIError {
    return {
      code: type.toUpperCase(),
      message,
      type,
      retryAfter,
      provider,
    };
  }

  // Utility methods
  getAvailableModels(): Array<{
    model: AIModel;
    info: (typeof AI_MODEL_INFO)[AIModel];
  }> {
    return Object.entries(AI_MODEL_INFO).map(([model, info]) => ({
      model: model as AIModel,
      info,
    }));
  }

  isModelAvailable(model: AIModel): boolean {
    const provider = DEFAULT_MODEL_CONFIGS[model].provider;

    if (this.mockMode) return true;

    return (
      (provider === AIProvider.OPENAI && !!env.OPENAI_API_KEY) ||
      (provider === AIProvider.ANTHROPIC && !!env.ANTHROPIC_API_KEY) ||
      (provider === AIProvider.GOOGLE && !!env.GOOGLE_GENERATIVE_AI_API_KEY)
    );
  }

  getRateLimitInfo(provider: AIProvider) {
    return rateLimiter.getRateLimitInfo(provider);
  }
}

// Singleton AI model manager
export const aiModels = new AIModelManager();

// Convenience functions
export async function generateAIResponse(
  model: AIModel,
  messages: AIMessage[],
  config?: Partial<AIModelConfig>,
): Promise<AIResponse> {
  return (await aiModels.generateResponse(
    model,
    messages,
    config,
  )) as AIResponse;
}

export async function generateAIStream(
  model: AIModel,
  messages: AIMessage[],
  config?: Partial<AIModelConfig>,
): Promise<AsyncGenerator<AIStreamChunk>> {
  return (await aiModels.generateResponse(
    model,
    messages,
    config,
    true,
  )) as AsyncGenerator<AIStreamChunk>;
}
