import { NextResponse } from "next/server";
import { queues } from "@/jobs";

export async function GET() {
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
