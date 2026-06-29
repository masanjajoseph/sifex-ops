import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/monitoring/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await getMetrics();
  return new NextResponse(metrics, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
