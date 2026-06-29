import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: env.UPSTASH_REDIS_URL || "",
  token: env.UPSTASH_REDIS_TOKEN || "",
});

const ratelimits = {
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    prefix: "rl:default",
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "rl:auth",
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "60 s"),
    prefix: "rl:api",
  }),
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, "60 s"),
    prefix: "rl:public",
  }),
} as const;

export type RateLimitScope = keyof typeof ratelimits;

export async function checkRateLimit(
  identifier: string,
  scope: RateLimitScope = "default",
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = ratelimits[scope];
  const result = await limiter.limit(identifier);
  return result;
}

export function rateLimitMiddleware(scope: RateLimitScope = "default") {
  return async (request: Request) => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const result = await checkRateLimit(ip, scope);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        },
      );
    }
    return null;
  };
}
