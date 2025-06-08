// Rate Limiting System for AI API Calls
// Prevents API quota exhaustion and handles 429 responses

/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable @typescript-eslint/no-inferrable-types */

import { AIProvider, type RateLimitInfo } from "./types";

interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerHour: number;
  tokensPerHour: number;
}

interface RateLimitEntry {
  requests: Array<{ timestamp: number; tokens: number }>;
  lastReset: number;
}

const DEFAULT_RATE_LIMITS: Record<AIProvider, RateLimitConfig> = {
  [AIProvider.OPENAI]: {
    requestsPerMinute: 500,
    tokensPerMinute: 160000,
    requestsPerHour: 10000,
    tokensPerHour: 2000000,
  },
  [AIProvider.ANTHROPIC]: {
    requestsPerMinute: 50,
    tokensPerMinute: 40000,
    requestsPerHour: 1000,
    tokensPerHour: 400000,
  },
  [AIProvider.GOOGLE]: {
    requestsPerMinute: 60,
    tokensPerMinute: 32000,
    requestsPerHour: 1500,
    tokensPerHour: 1000000,
  },
};

class RateLimiter {
  private limits: Map<AIProvider, RateLimitEntry> = new Map();
  private config: Record<AIProvider, RateLimitConfig>;

  constructor(customConfig?: Partial<Record<AIProvider, RateLimitConfig>>) {
    this.config = { ...DEFAULT_RATE_LIMITS, ...customConfig };

    // Initialize rate limit tracking for each provider
    Object.values(AIProvider).forEach((provider) => {
      this.limits.set(provider, {
        requests: [],
        lastReset: Date.now(),
      });
    });
  }

  async checkRateLimit(
    provider: AIProvider,
    estimatedTokens: number = 1000,
  ): Promise<{ allowed: boolean; retryAfter?: number; info: RateLimitInfo }> {
    const now = Date.now();
    const entry = this.limits.get(provider)!;
    const config = this.config[provider];

    // Clean up old entries (older than 1 hour)
    entry.requests = entry.requests.filter(
      (req) => now - req.timestamp < 60 * 60 * 1000,
    );

    // Calculate current usage
    const recentRequests = entry.requests.filter(
      (req) => now - req.timestamp < 60 * 1000,
    );
    const recentTokens = recentRequests.reduce(
      (sum, req) => sum + req.tokens,
      0,
    );

    const hourlyRequests = entry.requests.length;
    const hourlyTokens = entry.requests.reduce(
      (sum, req) => sum + req.tokens,
      0,
    );

    // Check limits
    const minuteRequestsExceeded =
      recentRequests.length >= config.requestsPerMinute;
    const minuteTokensExceeded =
      recentTokens + estimatedTokens > config.tokensPerMinute;
    const hourlyRequestsExceeded = hourlyRequests >= config.requestsPerHour;
    const hourlyTokensExceeded =
      hourlyTokens + estimatedTokens > config.tokensPerHour;

    const rateLimitInfo: RateLimitInfo = {
      requestsRemaining: Math.max(
        0,
        config.requestsPerMinute - recentRequests.length,
      ),
      tokensRemaining: Math.max(0, config.tokensPerMinute - recentTokens),
      resetTime: now + 60 * 1000, // Next minute
      provider,
    };

    if (
      minuteRequestsExceeded ||
      minuteTokensExceeded ||
      hourlyRequestsExceeded ||
      hourlyTokensExceeded
    ) {
      const retryAfter =
        minuteRequestsExceeded || minuteTokensExceeded
          ? 60 - Math.floor((now % (60 * 1000)) / 1000) // Wait until next minute
          : 3600 - Math.floor((now % (60 * 60 * 1000)) / 1000); // Wait until next hour

      return {
        allowed: false,
        retryAfter,
        info: rateLimitInfo,
      };
    }

    return {
      allowed: true,
      info: rateLimitInfo,
    };
  }

  recordRequest(provider: AIProvider, tokensUsed: number): void {
    const entry = this.limits.get(provider)!;
    entry.requests.push({
      timestamp: Date.now(),
      tokens: tokensUsed,
    });
  }

  getRateLimitInfo(provider: AIProvider): RateLimitInfo {
    const now = Date.now();
    const entry = this.limits.get(provider)!;
    const config = this.config[provider];

    // Clean up and calculate current usage
    entry.requests = entry.requests.filter(
      (req) => now - req.timestamp < 60 * 60 * 1000,
    );

    const recentRequests = entry.requests.filter(
      (req) => now - req.timestamp < 60 * 1000,
    );
    const recentTokens = recentRequests.reduce(
      (sum, req) => sum + req.tokens,
      0,
    );

    return {
      requestsRemaining: Math.max(
        0,
        config.requestsPerMinute - recentRequests.length,
      ),
      tokensRemaining: Math.max(0, config.tokensPerMinute - recentTokens),
      resetTime: now + 60 * 1000,
      provider,
    };
  }

  // Handle 429 responses from API
  handleRateLimitResponse(
    provider: AIProvider,
    retryAfterHeader?: string,
  ): { retryAfter: number } {
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60; // Default to 60 seconds

    // Update our internal tracking to reflect the server's rate limit
    const entry = this.limits.get(provider)!;
    const now = Date.now();

    // Add a dummy request to trigger rate limiting
    entry.requests.push({
      timestamp: now,
      tokens: this.config[provider].tokensPerMinute,
    });

    return { retryAfter };
  }

  // Reset rate limits (useful for testing)
  reset(provider?: AIProvider): void {
    if (provider) {
      this.limits.set(provider, {
        requests: [],
        lastReset: Date.now(),
      });
    } else {
      Object.values(AIProvider).forEach((p) => {
        this.limits.set(p, {
          requests: [],
          lastReset: Date.now(),
        });
      });
    }
  }
}

// Singleton rate limiter instance
export const rateLimiter = new RateLimiter();

// Utility function for exponential backoff
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

// Utility function to wait with exponential backoff
export async function waitWithBackoff(
  attempt: number,
  baseDelay?: number,
): Promise<void> {
  const delay = calculateBackoff(attempt, baseDelay);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
