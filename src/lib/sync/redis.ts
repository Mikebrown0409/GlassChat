import { Redis } from "@upstash/redis";

// Local mock Redis client for development/fallback
class MockRedis {
  private data = new Map<string, unknown>();
  private lists = new Map<string, string[]>();
  private sets = new Map<string, Set<string>>();
  private subscribers = new Map<string, Set<(message: unknown) => void>>();
  private timers = new Set<NodeJS.Timeout>();

  async get(key: string): Promise<unknown> {
    return this.data.get(key) ?? null;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number },
  ): Promise<string> {
    this.data.set(key, value);
    if (options?.ex) {
      const timer = setTimeout(() => {
        this.data.delete(key);
        this.timers.delete(timer);
      }, options.ex * 1000);
      this.timers.add(timer);
    }
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace("*", ".*"));
    return Array.from(this.data.keys()).filter((key) => regex.test(key));
  }

  async sadd(key: string, member: string): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    const sizeBefore = set.size;
    set.add(member);
    return set.size - sizeBefore;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async srem(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    return set?.delete(member) ? 1 : 0;
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.push(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const list = this.lists.get(key);
    if (list) {
      const trimmed = list.slice(start, stop === -1 ? undefined : stop + 1);
      this.lists.set(key, trimmed);
    }
    return "OK";
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key)) {
      const timer = setTimeout(() => {
        this.data.delete(key);
        this.timers.delete(timer);
      }, seconds * 1000);
      this.timers.add(timer);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    // In MockRedis, we don't track expiration time precisely
    // Return -1 for keys without expiration, -2 for non-existent keys
    if (!this.data.has(key)) {
      return -2;
    }
    return -1; // Assume no expiration for simplicity
  }

  async publish(channel: string, message: unknown): Promise<number> {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      callbacks.forEach((callback) => callback(message));
      return callbacks.size;
    }
    return 0;
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

  async cleanup(): Promise<void> {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.data.clear();
    this.lists.clear();
    this.sets.clear();
    this.subscribers.clear();
  }
}

// Production-safe Redis client creation
function createRedisClient() {
  // Development override: Always use local Redis in development for easier testing
  if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
    try {
      // Only import ioredis in development and server-side
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const IORedis = require("ioredis").Redis as typeof Redis;
      console.log("🔧 Using local Redis (development override)");
      return new IORedis({
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });
    } catch (error) {
      console.warn("Failed to connect to local Redis in development:", error);
      console.log("🔧 Falling back to MockRedis");
      return new MockRedis();
    }
  }

  // Production: Use Upstash Redis if configured
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    console.log("🔧 Using Upstash Redis");
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  // Fallback: Use MockRedis for client-side or when Redis is unavailable
  console.log("🔧 Using MockRedis (fallback)");
  return new MockRedis();
}

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | MockRedis | undefined;
};

export const redis =
  globalForRedis.redisClient ??
  (globalForRedis.redisClient = createRedisClient());

export type RedisClient = typeof redis;
