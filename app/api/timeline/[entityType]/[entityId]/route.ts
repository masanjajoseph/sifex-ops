import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { entityType, entityId } = await params;

  const validTypes = ["MasterAWB", "HouseAWB"];
  if (!validTypes.includes(entityType)) {
    return apiError(new Error("Invalid entity type. Must be MasterAWB or HouseAWB"), 400);
  }

  const timeline = await prisma.shipmentTimeline.findMany({
    where: { aggregateId: entityId, aggregateType: entityType },
    orderBy: { createdAt: "desc" },
  });

  const userIds = [...new Set(timeline.map((t) => t.userId))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, department: { select: { name: true, code: true } }, branch: { select: { id: true, name: true, code: true } }, position: { select: { id: true, name: true, code: true } } },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = timeline.map((t) => {
    const user = userMap.get(t.userId);
    return {
      id: t.id,
      eventType: t.eventType,
      title: t.title,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      userId: t.userId,
      stationId: t.stationId,
      visibility: t.visibility,
      workflowStage: t.workflowStage,
      oldStatus: t.oldStatus,
      newStatus: t.newStatus,
      action: t.action,
      departmentId: t.departmentId,
      branchId: t.branchId,
      notes: t.notes,
      metadata: t.metadata,
      user: user ? { firstName: user.firstName, lastName: user.lastName } : null,
      department: user?.department?.name || user?.department?.code || null,
      branch: user?.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
      position: user?.position ? { id: user.position.id, name: user.position.name, code: user.position.code } : null,
    };
  });

  return apiSuccess(enriched);
});
