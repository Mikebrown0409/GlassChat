// AI Model Integration Types for GlassChat
// Provides type-safe interfaces for multiple AI providers

export enum AIModel {
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
  GEMINI_2_0_FLASH = "gemini-2.0-flash-exp",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  GEMINI_1_5_PRO = "gemini-1.5-pro",
}

export enum AIProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface AIModelConfig {
  provider: AIProvider;
  model: AIModel;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIResponse {
  content: string;
  model: AIModel;
  provider: AIProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "tool_calls";
  responseTime: number;
}

export interface AIError {
  code: string;
  message: string;
  type: "rate_limit" | "api_key" | "model_unavailable" | "network" | "unknown";
  retryAfter?: number;
  provider: AIProvider;
}

export interface RateLimitInfo {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: number;
  provider: AIProvider;
}

export interface AIModelInfo {
  model: AIModel;
  provider: AIProvider;
  displayName: string;
  description: string;
  maxContextLength: number;
  inputPricing: number; // per 1K tokens
  outputPricing: number; // per 1K tokens
  isAvailable: boolean;
}

// Default model configurations
export const DEFAULT_MODEL_CONFIGS: Record<AIModel, AIModelConfig> = {
  [AIModel.GPT_4]: {
    provider: AIProvider.OPENAI,
    model: AIModel.GPT_4,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  [AIModel.GPT_4_TURBO]: {
    provider: AIProvider.OPENAI,
    model: AIModel.GPT_4_TURBO,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  [AIModel.GPT_3_5_TURBO]: {
    provider: AIProvider.OPENAI,
    model: AIModel.GPT_3_5_TURBO,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  [AIModel.CLAUDE_3_OPUS]: {
    provider: AIProvider.ANTHROPIC,
    model: AIModel.CLAUDE_3_OPUS,
    maxTokens: 4096,
    temperature: 0.7,
  },
  [AIModel.CLAUDE_3_SONNET]: {
    provider: AIProvider.ANTHROPIC,
    model: AIModel.CLAUDE_3_SONNET,
    maxTokens: 4096,
    temperature: 0.7,
  },
  [AIModel.CLAUDE_3_HAIKU]: {
    provider: AIProvider.ANTHROPIC,
    model: AIModel.CLAUDE_3_HAIKU,
    maxTokens: 4096,
    temperature: 0.7,
  },
  [AIModel.GEMINI_2_0_FLASH]: {
    provider: AIProvider.GOOGLE,
    model: AIModel.GEMINI_2_0_FLASH,
    maxTokens: 8192,
    temperature: 0.7,
  },
  [AIModel.GEMINI_1_5_FLASH]: {
    provider: AIProvider.GOOGLE,
    model: AIModel.GEMINI_1_5_FLASH,
    maxTokens: 8192,
    temperature: 0.7,
  },
  [AIModel.GEMINI_1_5_PRO]: {
    provider: AIProvider.GOOGLE,
    model: AIModel.GEMINI_1_5_PRO,
    maxTokens: 8192,
    temperature: 0.7,
  },
};

// Model information for UI display
export const AI_MODEL_INFO: Record<AIModel, AIModelInfo> = {
  [AIModel.GPT_4]: {
    model: AIModel.GPT_4,
    provider: AIProvider.OPENAI,
    displayName: "GPT-4",
    description: "Most capable OpenAI model, excellent for complex reasoning",
    maxContextLength: 8192,
    inputPricing: 0.03,
    outputPricing: 0.06,
    isAvailable: true,
  },
  [AIModel.GPT_4_TURBO]: {
    model: AIModel.GPT_4_TURBO,
    provider: AIProvider.OPENAI,
    displayName: "GPT-4 Turbo",
    description: "Faster and more efficient GPT-4 with larger context",
    maxContextLength: 128000,
    inputPricing: 0.01,
    outputPricing: 0.03,
    isAvailable: true,
  },
  [AIModel.GPT_3_5_TURBO]: {
    model: AIModel.GPT_3_5_TURBO,
    provider: AIProvider.OPENAI,
    displayName: "GPT-3.5 Turbo",
    description: "Fast and cost-effective for most tasks",
    maxContextLength: 16384,
    inputPricing: 0.001,
    outputPricing: 0.002,
    isAvailable: true,
  },
  [AIModel.CLAUDE_3_OPUS]: {
    model: AIModel.CLAUDE_3_OPUS,
    provider: AIProvider.ANTHROPIC,
    displayName: "Claude 3 Opus",
    description: "Anthropic's most powerful model for complex tasks",
    maxContextLength: 200000,
    inputPricing: 0.015,
    outputPricing: 0.075,
    isAvailable: true,
  },
  [AIModel.CLAUDE_3_SONNET]: {
    model: AIModel.CLAUDE_3_SONNET,
    provider: AIProvider.ANTHROPIC,
    displayName: "Claude 3 Sonnet",
    description: "Balanced performance and speed",
    maxContextLength: 200000,
    inputPricing: 0.003,
    outputPricing: 0.015,
    isAvailable: true,
  },
  [AIModel.CLAUDE_3_HAIKU]: {
    model: AIModel.CLAUDE_3_HAIKU,
    provider: AIProvider.ANTHROPIC,
    displayName: "Claude 3 Haiku",
    description: "Fastest Claude model for quick responses",
    maxContextLength: 200000,
    inputPricing: 0.00025,
    outputPricing: 0.00125,
    isAvailable: true,
  },
  [AIModel.GEMINI_2_0_FLASH]: {
    model: AIModel.GEMINI_2_0_FLASH,
    provider: AIProvider.GOOGLE,
    displayName: "Gemini 2.0 Flash",
    description:
      "Google's newest and fastest model with multimodal capabilities",
    maxContextLength: 1000000,
    inputPricing: 0.0,
    outputPricing: 0.0,
    isAvailable: true,
  },
  [AIModel.GEMINI_1_5_FLASH]: {
    model: AIModel.GEMINI_1_5_FLASH,
    provider: AIProvider.GOOGLE,
    displayName: "Gemini 1.5 Flash",
    description: "Fast and efficient for most tasks with large context",
    maxContextLength: 1000000,
    inputPricing: 0.0,
    outputPricing: 0.0,
    isAvailable: true,
  },
  [AIModel.GEMINI_1_5_PRO]: {
    model: AIModel.GEMINI_1_5_PRO,
    provider: AIProvider.GOOGLE,
    displayName: "Gemini 1.5 Pro",
    description: "Google's most capable model for complex reasoning",
    maxContextLength: 2000000,
    inputPricing: 0.0,
    outputPricing: 0.0,
    isAvailable: true,
  },
};
