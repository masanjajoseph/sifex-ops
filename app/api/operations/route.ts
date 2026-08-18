import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "overview";

  if (scope === "overview") {
    const [
      queueStats,
      slaStats,
      escalationStats,
      assignmentStats,
      jobStats,
      documentStats,
      activeShipments,
    ] = await Promise.all([
      prisma.workQueueItem.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.sLATracker.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.escalation.groupBy({
        by: ["status", "severity"],
        _count: true,
      }),
      prisma.assignment.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.backgroundJob.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.document.groupBy({
        by: ["status"],
        _count: true,
        where: { deletedAt: null },
      }),
      prisma.masterAWB.count({
        where: { cargoStatus: { notIn: ["DELIVERED", "CANCELLED"] as CargoStatus[] } },
      }),
    ]);

    const slaBreaches = await prisma.sLATracker.count({
      where: { status: "BREACHED" },
    });

    const overdueEscalations = await prisma.escalation.count({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] as any }, deadlineAt: { lt: new Date() } },
    });

    const unassignedQueueItems = await prisma.workQueueItem.count({
      where: { assignedUserId: null, status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] as any } },
    });

    return apiSuccess({
      queues: queueStats,
      sla: { breached: slaBreaches, trackers: slaStats },
      escalations: escalationStats,
      overdueEscalations,
      assignments: assignmentStats,
      jobs: jobStats,
      documents: documentStats,
      activeShipments,
      unassignedQueueItems,
    });
  }

  if (scope === "bottlenecks") {
    const bottlenecks = await prisma.workQueueItem.groupBy({
      by: ["status"],
      _count: true,
      where: { status: { in: ["WAITING", "ASSIGNED"] as any } },
      orderBy: { _count: { id: "desc" as any } },
      take: 20,
    });

    const slaThreshold = await prisma.sLATracker.count({
      where: { status: "WARNING" },
    });

    return apiSuccess({ bottlenecks, slaThreshold });
  }

  return apiError(new Error("Invalid scope"), 400);
});
