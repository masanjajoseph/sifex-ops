import { getOrSet, invalidatePattern } from "@/lib/cache";
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
  return getOrSet(key, fetch, options.ttl || CACHE_TTL.SHORT);
}

export function invalidateListCache(resource: string): void {
  invalidatePattern(`api:list:${resource}:*`);
}
