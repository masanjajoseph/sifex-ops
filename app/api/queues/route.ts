import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { getQueueItems, getQueueKpis, getDepartmentQueues, skipQueueItem, dequeueEntity } from "@/lib/queue-engine";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const queueCode = searchParams.get("queueCode");
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const assignee = searchParams.get("assignee") || undefined;
  const department = searchParams.get("department");

  if (department) {
    const queues = await getDepartmentQueues(department);
    return apiSuccess(queues);
  }

  if (queueCode) {
    const result = await getQueueItems(queueCode, status, limit, (page - 1) * limit, assignee);
    return apiSuccess(result);
  }

  const kpis = await getQueueKpis();
  return apiSuccess(kpis);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action, itemId, entityType, entityId, status, reason } = body;

  if (action === "dequeue" && entityType && entityId) {
    await dequeueEntity(entityType, entityId, session.user.id!, status as any);
    return apiSuccess({ success: true });
  }

  if (action === "skip" && itemId) {
    await skipQueueItem(itemId, reason || "Skipped");
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
