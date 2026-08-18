import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { getWorkflowProgress } from "@/lib/workflow-progress";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const status = searchParams.get("status");

  if (!entityType || !entityId) {
    return apiError(new Error("entityType and entityId are required"), 400);
  }

  const progress = await getWorkflowProgress(entityType, entityId, status);

  return apiSuccess(progress);
});
