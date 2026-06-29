import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export const cache = new Redis({
  url: env.UPSTASH_REDIS_URL || "",
  token: env.UPSTASH_REDIS_TOKEN || "",
});

export async function getOrSet<T>(
  key: string,
  fetch: () => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;
  const value = await fetch();
  await cache.setex(key, ttlSeconds, value);
  return value;
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await cache.keys(pattern);
  if (keys.length > 0) await cache.del(...keys);
}

export async function withCacheInvalidation<T>(
  pattern: string,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  await invalidatePattern(pattern);
  return result;
}
