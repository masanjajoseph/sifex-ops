import { NextRequest, NextResponse } from "next/server";
import { getActivityFeed, getActivityFeedSummary } from "@/lib/activity-feed";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const summary = searchParams.get("summary") === "true";

  if (summary) {
    const departmentId = searchParams.get("departmentId") || undefined;
    const since = searchParams.get("since") ? new Date(searchParams.get("since")!) : undefined;
    const feedSummary = await getActivityFeedSummary({ departmentId, since });
    return NextResponse.json(feedSummary);
  }

  const result = await getActivityFeed({
    limit: parseInt(searchParams.get("limit") || "50"),
    cursor: searchParams.get("cursor") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    entityId: searchParams.get("entityId") || undefined,
    departmentId: searchParams.get("departmentId") || undefined,
    userId: searchParams.get("userId") || undefined,
    eventType: searchParams.get("eventType") || undefined,
    priority: searchParams.get("priority") || undefined,
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
  });

  return NextResponse.json(result);
}
