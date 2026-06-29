import { env } from "@/lib/env";
import { Redis } from "ioredis";
import { Queue, Worker, type Processor } from "bullmq";

const connection = new Redis(env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const DEFAULT_QUEUE = "sifex-jobs";

export const queues = {
  tcra: new Queue("sifex-tcra", { connection }),
  pdf: new Queue("sifex-pdf", { connection }),
  notification: new Queue("sifex-notification", { connection }),
  analytics: new Queue("sifex-analytics", { connection }),
} as const;

export async function enqueue(
  queueName: keyof typeof queues,
  jobName: string,
  data: Record<string, unknown>,
  options?: { delay?: number; attempts?: number },
) {
  return queues[queueName].add(jobName, data, {
    attempts: options?.attempts ?? 3,
    backoff: { type: "exponential", delay: 2000 },
    delay: options?.delay,
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  });
}

export function createWorker(
  queueName: keyof typeof queues,
  processor: Processor,
) {
  return new Worker(queueName === "tcra" ? "sifex-tcra"
    : queueName === "pdf" ? "sifex-pdf"
    : queueName === "notification" ? "sifex-notification"
    : "sifex-analytics",
    processor,
    { connection, concurrency: 5 },
  );
}
