import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { WorkflowStage } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const draftCount = await prisma.masterAWB.count({
    where: { workflowStatus: "DRAFT", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const validatedCount = await prisma.masterAWB.count({
    where: { workflowStatus: "VALIDATED", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const hawbGeneratedCount = await prisma.masterAWB.count({
    where: { workflowStatus: "HAWB_GENERATED", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const loadingCount = await prisma.masterAWB.count({
    where: { workflowStatus: "LOADING", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const loadedCount = await prisma.masterAWB.count({
    where: { workflowStatus: "LOADED", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const mawbAssignedCount = await prisma.masterAWB.count({
    where: { workflowStatus: "MAWB_ASSIGNED", deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const readyForDispatchCount = await prisma.masterAWB.count({
    where: { workflowStatus: { in: ["MANIFEST_CREATED", "FLIGHT_ASSIGNED", "READY_FOR_DISPATCH"] }, deletedAt: null, workflowStage: WorkflowStage.EXPORT },
  });

  const dispatchedToday = await prisma.masterAWB.count({
    where: { workflowStatus: "DISPATCHED", deletedAt: null, workflowStage: WorkflowStage.EXPORT, updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });

  const flightsToday = await prisma.flight.count({
    where: { departureTime: { gte: new Date(), lte: new Date(new Date().setHours(23, 59, 59, 999)) }, deletedAt: null },
  });

  // Simplified export pipeline counters (ACCEPTED → ASSIGNED → MANIFESTED → LOADED → DEPARTED → IN TRANSIT)
  const pipelineCounts = await prisma.masterAWB.groupBy({
    by: ["workflowStatus"],
    where: { deletedAt: null, workflowStage: WorkflowStage.EXPORT },
    _count: { _all: true },
  });
  const countFor = (statuses: string[]) =>
    pipelineCounts
      .filter((r) => statuses.includes(r.workflowStatus))
      .reduce((sum, r) => sum + r._count._all, 0);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [totalRevenueMonth, avgProcessingTime, flightUtilization] = await Promise.all([
    prisma.billingRecord.aggregate({
      where: { deletedAt: null, createdAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }).then(r => r._sum.totalAmount || 0),
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (m.departed_at - m.created_at)) / 3600)::float as avg_hours
      FROM master_awbs m
      WHERE m.departed_at IS NOT NULL AND m.created_at >= ${monthStart}
    `.then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      return row?.avg_hours ? Math.round(row.avg_hours * 100) / 100 : 0;
    }),
    prisma.flight.aggregate({
      where: { deletedAt: null, status: { notIn: ["CANCELLED"] } },
      _sum: { totalCapacity: true, availableCapacity: true },
    }).then(r => ({
      totalCapacity: r._sum.totalCapacity || 0,
      availableCapacity: r._sum.availableCapacity || 0,
      utilizationRate: r._sum.totalCapacity && r._sum.totalCapacity > 0
        ? Math.round(((r._sum.totalCapacity - (r._sum.availableCapacity || 0)) / r._sum.totalCapacity) * 10000) / 100
        : 0,
    })),
  ]);

  return apiSuccess({
    acceptedCount: countFor(["ACCEPTED"]),
    assignedCount: countFor(["ASSIGNED"]),
    manifestedCount: countFor(["MANIFESTED"]),
    loadedCount,
    departedCount: countFor(["DEPARTED"]),
    inTransitCount: countFor(["IN_TRANSIT", "PRE_ARRIVAL"]),
    draftCount,
    validatedCount,
    hawbGeneratedCount,
    loadingCount,
    loadedCount,
    mawbAssignedCount,
    readyForDispatchCount,
    dispatchedToday,
    flightsToday,
    totalRevenueMonth,
    avgProcessingTime,
    flightUtilization,
  });
});
