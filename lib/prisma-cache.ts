import { cache } from "@/lib/cache";
import { dbQueryDuration } from "@/lib/monitoring/metrics";

const queryTimings = new Map<string, number>();

export function prismaCacheExtension() {
  return {
    name: "cache" as const,
    query: {
      async $allOperations({ model, operation, args, query }: {
        model: string;
        operation: string;
        args: unknown[];
        query: () => Promise<unknown>;
      }) {
        const start = Date.now();
        const isRead = ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"].includes(operation);
        const cacheKey = model && isRead ? `prisma:${model}:${operation}:${JSON.stringify(args)}` : null;

        if (cacheKey && operation === "findUnique") {
          const cached = await cache.get(cacheKey);
          if (cached !== null) {
            dbQueryDuration.observe({ operation, model }, 0);
            return cached;
          }
        }

        try {
          const result = await query();

          if (cacheKey && operation === "findUnique" && result) {
            await cache.setex(cacheKey, 300, result);
          }

          return result;
        } finally {
          const duration = (Date.now() - start) / 1000;
          dbQueryDuration.observe({ operation, model }, duration);
        }
      },
    },
  } as const;
}
