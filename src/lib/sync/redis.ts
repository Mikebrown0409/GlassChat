import { Redis } from "@upstash/redis";

// Local mock Redis client for development
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
    // Mock expiration with setTimeout if needed
    if (options?.ex) {
      const timer = setTimeout(() => {
        this.data.delete(key);
        this.timers.delete(timer);
      }, options.ex * 1000);
      this.timers.add(timer);
    }
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
    const deleted = this.data.delete(key) ? 1 : 0;
    this.lists.delete(key);
    this.sets.delete(key);
    return deleted;
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    if (stop === -1) stop = list.length - 1;
    return list.slice(start, stop + 1);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const list = this.lists.get(key) ?? [];
    if (stop === -1) stop = list.length - 1;
    const trimmed = list.slice(start, stop + 1);
    this.lists.set(key, trimmed);
    return "OK";
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    members.forEach((member) => {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    });
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    members.forEach((member) => {
      if (set.has(member)) {
        set.delete(member);
        removed++;
      }
    });
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key) ?? new Set();
    return Array.from(set);
  }

  // Utility operations
  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for mock
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const allKeys = [
      ...this.data.keys(),
      ...this.lists.keys(),
      ...this.sets.keys(),
    ];
    return allKeys.filter((key) => regex.test(key)).map(String);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key) || this.lists.has(key) || this.sets.has(key)) {
      const timer = setTimeout(() => {
        this.data.delete(key);
        this.lists.delete(key);
        this.sets.delete(key);
        this.timers.delete(timer);
      }, seconds * 1000);
      this.timers.add(timer);
      return 1;
    }
    return 0;
  }

  // Cleanup method to clear all timers
  cleanup(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.data.clear();
    this.lists.clear();
    this.sets.clear();
    this.subscribers.clear();
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
