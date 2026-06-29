import { NextRequest, NextResponse } from "next/server";
import { enqueue } from "@/jobs";

export async function POST(req: NextRequest) {
  try {
    const { queue, jobName, data, options } = await req.json();
    const validQueues = ["tcra", "pdf", "notification", "analytics"] as const;
    if (!validQueues.includes(queue)) {
      return NextResponse.json({ success: false, error: "Invalid queue" }, { status: 400 });
    }
    const job = await enqueue(queue, jobName, data, options);
    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error("[Enqueue Error]", error);
    return NextResponse.json({ success: false, error: "Failed to enqueue job" }, { status: 500 });
  }
}
