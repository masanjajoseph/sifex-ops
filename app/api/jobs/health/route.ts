import { NextResponse } from "next/server";
import { getQueues, isQueueConfigured } from "@/jobs";

export async function GET() {
  const queues = getQueues();
  if (!queues) {
    return NextResponse.json({
      success: true,
      queues: {},
      note: isQueueConfigured() ? "Queues unavailable" : "REDIS_URL not configured",
    });
  }
  const results: Record<string, unknown> = {};
  for (const [name, queue] of Object.entries(queues)) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    results[name] = { waiting, active, completed, failed };
  }
  return NextResponse.json({ success: true, queues: results });
}
