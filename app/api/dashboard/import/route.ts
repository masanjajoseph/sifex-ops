import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    preArrival, terminalArrived, pendingInspection, customsPending,
    readyForWarehouse, exceptionCount, customsHold, totalImport,
    releasedToday, manifestedCount
  ] = await Promise.all([
    prisma.masterAWB.count({ where: { workflowStatus: "PRE_ARRIVAL", deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: "TERMINAL_ARRIVED", deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: { in: ["RECEIVED", "DOCUMENTS_VERIFIED", "PIECES_VERIFIED", "WEIGHT_VERIFIED", "DAMAGE_INSPECTED"] }, deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: { in: ["CUSTOMS_SUBMITTED", "CUSTOMS_ASSESSED", "CUSTOMS_PAID", "CUSTOMS_INSPECTION"] }, deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: "WAREHOUSE_RECEIVING", deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: "EXCEPTION", deletedAt: null } }),
    prisma.masterAWB.count({ where: { cargoStatus: "CUSTOMS_HOLD", deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: { in: ["PRE_ARRIVAL", "TERMINAL_ARRIVED", "MANIFEST_VERIFIED", "MAWB_RECEIVED", "RECEIVED", "DOCUMENTS_VERIFIED", "PIECES_VERIFIED", "WEIGHT_VERIFIED", "DAMAGE_INSPECTED", "CUSTOMS_SUBMITTED", "CUSTOMS_ASSESSED", "CUSTOMS_PAID", "CUSTOMS_INSPECTION", "CUSTOMS_CLEARED", "WAREHOUSE_RECEIVING", "EXCEPTION"] }, deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: "WAREHOUSE_RECEIVING", updatedAt: { gte: today }, deletedAt: null } }),
    prisma.masterAWB.count({ where: { workflowStatus: "MANIFEST_VERIFIED", deletedAt: null } }),
  ]);

  const [
    avgProcessingTime,
    receivedMonth
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (m.updated_at - m.created_at)) / 3600)::float as avg_hours
      FROM master_awbs m
      WHERE m.workflow_status = 'WAREHOUSE_RECEIVING' AND m.updated_at IS NOT NULL AND m.created_at IS NOT NULL
    `.then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      return row?.avg_hours ? Math.round(row.avg_hours * 100) / 100 : 0;
    }),
    prisma.masterAWB.count({ where: { workflowStatus: { in: ["RECEIVED", "DOCUMENTS_VERIFIED", "PIECES_VERIFIED", "WEIGHT_VERIFIED", "DAMAGE_INSPECTED"] }, deletedAt: null, updatedAt: { gte: monthStart } } }),
  ]);

  return apiSuccess({
    preArrival,
    terminalArrived,
    pendingInspection,
    customsPending,
    readyForWarehouse,
    exceptionCount,
    customsHold,
    totalImport,
    releasedToday,
    manifestedCount,
    avgProcessingTime,
    receivedMonth,
  });
});
