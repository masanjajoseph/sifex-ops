import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { getEscalations, getEscalationSummary, createEscalation, escalateToNextLevel, acknowledgeEscalation, resolveEscalation } from "@/lib/escalation-engine";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const severity = searchParams.get("severity") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const scope = searchParams.get("scope");

  if (scope === "summary") {
    const summary = await getEscalationSummary();
    return apiSuccess(summary);
  }

  const result = await getEscalations(status, severity, limit, (page - 1) * limit);
  return apiSuccess(result);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const id = await createEscalation({
      entityType: body.entityType,
      entityId: body.entityId,
      entityNumber: body.entityNumber,
      reason: body.reason,
      severity: body.severity || "HIGH",
      source: body.source || "MANUAL",
      assignedToId: body.assignedToId,
      deadlineMinutes: body.deadlineMinutes,
    });
    return apiSuccess({ id }, 201);
  }

  if (action === "escalate" && body.escalationId) {
    const result = await escalateToNextLevel(body.escalationId, session.user.id!, body.note);
    return apiSuccess({ escalated: result });
  }

  if (action === "acknowledge" && body.escalationId) {
    await acknowledgeEscalation(body.escalationId, session.user.id!, body.note);
    return apiSuccess({ success: true });
  }

  if (action === "resolve" && body.escalationId) {
    await resolveEscalation(body.escalationId, session.user.id!, body.resolution);
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
