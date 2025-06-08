import { Redis } from "@upstash/redis";

// Local mock Redis client for development
class MockRedis {
  private data = new Map<string, unknown>();
  private subscribers = new Map<string, Set<(message: unknown) => void>>();

  async get(key: string): Promise<unknown> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: unknown): Promise<string> {
    this.data.set(key, value);
    return "OK";
  }

  async publish(channel: string, message: unknown): Promise<number> {
    const subs = this.subscribers.get(channel);
    if (subs) {
      subs.forEach((callback) => callback(message));
    }
    return subs?.size ?? 0;
  }

  async subscribe(
    channel: string,
    callback: (message: unknown) => void,
  ): Promise<void> {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }
}

// Initialize Redis client (use mock in development if no UPSTASH_REDIS_REST_URL)
export const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : new MockRedis();

export type RedisClient = typeof redis;
