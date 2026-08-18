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
  const scope = searchParams.get("scope") || "dashboard";

  if (scope === "dashboard") {
    const [
      activeShipments,
      revenue,
      pendingBilling,
      slaHealth,
      queueBacklog,
      escalationCount,
      activeJobs,
      documentCount,
    ] = await Promise.all([
      prisma.masterAWB.count({
        where: { cargoStatus: { notIn: ["DELIVERED", "CANCELLED"] as CargoStatus[] } },
      }),
      prisma.masterAWB.aggregate({
        _sum: { freight: true },
        where: { cargoStatus: { not: "CANCELLED" as CargoStatus } },
      }),
      prisma.billingRecord.count({
        where: { status: { in: ["UNPAID", "PARTIAL_PAID", "WAITING_PAYMENT"] as any } },
      }),
      prisma.sLATracker.findMany({
        select: { status: true },
      }),
      prisma.workQueueItem.count({
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] as any } },
      }),
      prisma.escalation.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] as any } },
      }),
      prisma.backgroundJob.count({
        where: { status: { in: ["QUEUED", "RUNNING", "PENDING"] } },
      }),
      prisma.document.count({
        where: { deletedAt: null },
      }),
    ]);

    const slaOk = slaHealth.filter(s => s.status === "ON_TRACK").length;
    const slaWarn = slaHealth.filter(s => s.status === "WARNING").length;
    const slaBreach = slaHealth.filter(s => s.status === "BREACHED").length;

    return apiSuccess({
      activeShipments,
      revenue: revenue._sum?.freight || 0,
      pendingBilling,
      sla: { onTrack: slaOk, warning: slaWarn, breached: slaBreach, total: slaHealth.length },
      queueBacklog,
      activeEscalations: escalationCount,
      activeJobs,
      totalDocuments: documentCount,
    });
  }

  if (scope === "performance") {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      monthlyShipments,
      monthlyRevenue,
      avgProcessingTime,
    ] = await Promise.all([
      prisma.masterAWB.count({
        where: { createdAt: { gte: thisMonth } },
      }),
      prisma.masterAWB.aggregate({
        _sum: { freight: true },
        where: { createdAt: { gte: thisMonth } },
      }),
      prisma.sLATracker.aggregate({
        _avg: { durationSeconds: true },
        where: { completedAt: { not: null } },
      }),
    ]);

    return apiSuccess({
      monthlyShipments,
      monthlyRevenue: monthlyRevenue._sum?.freight || 0,
      avgProcessingMinutes: Math.round((avgProcessingTime._avg?.durationSeconds || 0) / 60),
    });
  }

  return apiError(new Error("Invalid scope"), 400);
});
