import { prisma } from "@/lib/prisma";

interface BatchRequest {
  id: string;
  method: string;
  path: string;
  body?: unknown;
}

interface BatchResponse {
  id: string;
  status: number;
  body: unknown;
}

export async function handleBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
  return Promise.all(
    requests.map(async (req) => {
      try {
        const url = new URL(req.path, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
        const fetchOptions: RequestInit = { method: req.method, headers: { "Content-Type": "application/json" } };
        if (req.body) fetchOptions.body = JSON.stringify(req.body);
        const response = await fetch(url.toString(), fetchOptions);
        const body = await response.json();
        return { id: req.id, status: response.status, body };
      } catch (error) {
        return { id: req.id, status: 500, body: { error: "Internal batch error" } };
      }
    }),
  );
}

export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
): Promise<{ total: number; batches: number; errors: Error[] }> {
  const errors: Error[] = [];
  let processed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await processor(batch);
      processed += batch.length;
    } catch (error) {
      errors.push(error as Error);
    }
  }

  return { total: items.length, batches: Math.ceil(items.length / batchSize), errors };
}

export async function batchProcessQueueItems(
  queueId: string,
  batchSize = 50,
  processor: (itemIds: string[]) => Promise<void>,
): Promise<{ processed: number; errors: Error[] }> {
  const errors: Error[] = [];
  let processed = 0;
  let cursor: string | undefined;

  for (;;) {
    const items = await prisma.workQueueItem.findMany({
      where: { queueId, status: "PENDING" as any },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { priority: "asc" },
      select: { id: true },
    });

    if (items.length === 0) break;

    try {
      await processor(items.map(i => i.id));
      processed += items.length;
    } catch (error) {
      errors.push(error as Error);
    }

    cursor = items[items.length - 1].id;
  }

  return { processed, errors };
}
