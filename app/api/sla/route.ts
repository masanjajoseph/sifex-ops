import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { getSLAStatus, getSLASummary, getSLAByModule, checkSLAAlerts } from "@/lib/sla-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const scope = searchParams.get("scope");

  if (entityType && entityId) {
    const status = await getSLAStatus(entityType, entityId);
    return apiSuccess(status);
  }

  if (scope === "configs") {
    const configs = await getSLAByModule();
    return apiSuccess(configs);
  }

  const summary = await getSLASummary();
  const configs = await getSLAByModule();
  return apiSuccess({ ...summary, configs });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "check") {
    await checkSLAAlerts();
    return apiSuccess({ success: true });
  }

  if (action === "create-config") {
    const config = await prisma.sLAConfig.create({
      data: {
        name: body.name,
        code: body.code,
        module: body.module,
        workflowStage: body.workflowStage,
        fromStatus: body.fromStatus,
        targetMinutes: body.targetMinutes,
        warningMinutes: body.warningMinutes || 0,
        severity: body.severity || "MEDIUM",
      },
    });
    return apiSuccess(config, 201);
  }

  return apiError(new Error("Invalid action"), 400);
});
