import { cache } from "@/lib/cache";
import { CACHE_TTL } from "@/lib/cache/keys";

export async function getCachedResponse<T>(
  key: string,
  fetch: () => Promise<T>,
  ttl = CACHE_TTL.MEDIUM,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;

  const data = await fetch();
  await cache.setex(key, ttl, data);
  return data;
}

export function buildCacheKey(parts: string[]): string {
  return `api:${parts.join(":")}`;
}

export function buildListCacheKey(resource: string, params: Record<string, string | undefined>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return buildCacheKey(["list", resource, query]);
}
