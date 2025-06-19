// AI Model Integration Types for GlassChat
// Provides type-safe interfaces for multiple AI providers

export enum AIModel {
  // Production models (working)
  GPT_4O_MINI = "gpt-4o-mini",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite-preview-06-17",

  // Display-only models (grayed out)
  GPT_4_TURBO = "gpt-4-turbo",
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
}

export enum AIProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
}

// Block types for semantic streaming
export enum BlockType {
  PARAGRAPH = "paragraph",
  CODE_BLOCK = "code_block",
  HEADER = "header",
  LIST = "list",
  BLOCKQUOTE = "blockquote",
  TABLE = "table",
  INLINE = "inline", // For small chunks within larger blocks
}

export interface StreamBlock {
  type: BlockType;
  content: string;
  metadata?: {
    language?: string; // For code blocks
    level?: number; // For headers (1-6)
    ordered?: boolean; // For lists
    complete?: boolean; // Whether this block is finished
  };
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
  // Block-aware extensions (Phase 1)
  block?: StreamBlock;
  blockId?: string; // Unique identifier for block continuity
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
  [AIModel.GPT_4O_MINI]: {
    provider: AIProvider.OPENAI,
    model: AIModel.GPT_4O_MINI,
    maxTokens: 8192,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  [AIModel.GEMINI_2_5_FLASH_LITE]: {
    provider: AIProvider.GOOGLE,
    model: AIModel.GEMINI_2_5_FLASH_LITE,
    maxTokens: 8192,
    temperature: 0.7,
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
  [AIModel.CLAUDE_3_SONNET]: {
    provider: AIProvider.ANTHROPIC,
    model: AIModel.CLAUDE_3_SONNET,
    maxTokens: 4096,
    temperature: 0.7,
  },
};

// Model information for UI display
export const AI_MODEL_INFO: Record<AIModel, AIModelInfo> = {
  [AIModel.GPT_4O_MINI]: {
    model: AIModel.GPT_4O_MINI,
    provider: AIProvider.OPENAI,
    displayName: "GPT-4o Mini",
    description: "Cost-efficient, fast GPT-4o variant (mini)",
    maxContextLength: 128000,
    inputPricing: 0.005,
    outputPricing: 0.015,
    isAvailable: true,
  },
  [AIModel.GEMINI_2_5_FLASH_LITE]: {
    model: AIModel.GEMINI_2_5_FLASH_LITE,
    provider: AIProvider.GOOGLE,
    displayName: "Gemini 2.5 Flash-Lite",
    description:
      "Google's newest cost-efficient model with multimodal capabilities",
    maxContextLength: 1000000,
    inputPricing: 0.0,
    outputPricing: 0.0,
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
    isAvailable: false,
  },
  [AIModel.CLAUDE_3_SONNET]: {
    model: AIModel.CLAUDE_3_SONNET,
    provider: AIProvider.ANTHROPIC,
    displayName: "Claude 3 Sonnet",
    description: "Balanced performance and speed",
    maxContextLength: 200000,
    inputPricing: 0.003,
    outputPricing: 0.015,
    isAvailable: false,
  },
};
