import { cache } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/cache/keys";
import { buildListCacheKey } from "@/lib/api-cache";

export interface CachedListOptions {
  ttl?: number;
  tags?: string[];
}

export async function getCachedList<T>(
  resource: string,
  params: Record<string, string | undefined>,
  fetch: () => Promise<T>,
  options: CachedListOptions = {},
): Promise<T> {
  const key = buildListCacheKey(resource, params);
  return getOrSetCached(key, fetch, options.ttl || CACHE_TTL.SHORT);
}

async function getOrSetCached<T>(
  key: string,
  fetch: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;
  const value = await fetch();
  await cache.setex(key, ttl, value);
  return value;
}

export function invalidateListCache(resource: string): void {
  cache.delByPattern(`api:list:${resource}:*`);
}
