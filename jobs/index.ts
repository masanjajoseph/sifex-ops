import { env } from "@/lib/env";
import { Redis } from "ioredis";
import { Queue, Worker, type Processor, type ConnectionOptions, type Job } from "bullmq";

const QUEUE_NAMES = ["tcra", "pdf", "notification", "analytics"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

let redis: Redis | null | undefined;
let queueInstances: Record<QueueName, Queue> | null = null;

export function isQueueConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (!env.REDIS_URL) {
    redis = null;
    return null;
  }
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return redis;
}

export function getQueues(): Record<QueueName, Queue> | null {
  if (queueInstances) return queueInstances;
  const conn = getRedis();
  if (!conn) return null;

  const connection = conn as unknown as ConnectionOptions;
  queueInstances = {
    tcra: new Queue("sifex-tcra", { connection }),
    pdf: new Queue("sifex-pdf", { connection }),
    notification: new Queue("sifex-notification", { connection }),
    analytics: new Queue("sifex-analytics", { connection }),
  };
  return queueInstances;
}

export async function enqueue(
  queueName: QueueName,
  jobName: string,
  data: Record<string, unknown>,
  options?: { delay?: number; attempts?: number },
): Promise<Job | null> {
  const queues = getQueues();
  if (!queues) {
    console.warn(`[jobs] REDIS_URL not configured; skipping enqueue (${queueName}/${jobName})`);
    return null;
  }
  return queues[queueName].add(jobName, data, {
    attempts: options?.attempts ?? 3,
    backoff: { type: "exponential", delay: 2000 },
    delay: options?.delay,
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  });
}

export function createWorker(queueName: QueueName, processor: Processor): Worker {
  const conn = getRedis();
  if (!conn) {
    console.warn(`[jobs] REDIS_URL not configured; worker "${queueName}" disabled`);
    return {
      close: () => Promise.resolve(),
      run: () => Promise.resolve(),
    } as unknown as Worker;
  }
  return new Worker(`sifex-${queueName}`, processor, {
    connection: conn as unknown as ConnectionOptions,
    concurrency: 5,
  });
}