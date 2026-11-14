import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const awaitingStorage = await prisma.masterAWB.count({
    where: { workflowStatus: { in: ["WAREHOUSE_RECEIVING", "WAREHOUSE"] }, deletedAt: null },
  });

  const stored = await prisma.houseAWB.count({
    where: { workflowStatus: "STORED", deletedAt: null },
  });

  const waitingPayment = await prisma.billingRecord.count({
    where: { status: "WAITING_PAYMENT", deletedAt: null },
  });

  const storedToday = await prisma.masterAWB.count({
    where: {
      workflowStatus: { in: ["AWAITING_STORAGE", "STORED", "INVOICE_GENERATED", "WAITING_PAYMENT"] },
      updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      deletedAt: null,
    },
  });

  const invoiceGenerated = await prisma.masterAWB.count({
    where: { workflowStatus: "INVOICE_GENERATED", deletedAt: null },
  });

  const totalInventory = await prisma.houseAWB.count({
    where: { workflowStage: "WAREHOUSE", deletedAt: null },
  });

  // Storage-age metrics are derived from the HAWBs currently sitting in the
  // warehouse (the legacy warehouse_inventories table no longer exists).
  const warehouseHawbs = await prisma.houseAWB.findMany({
    where: { workflowStage: "WAREHOUSE", deletedAt: null },
    select: { createdAt: true, updatedAt: true },
  });
  const now = Date.now();
  const avgStorageTime = warehouseHawbs.length
    ? Math.round(
        (warehouseHawbs.reduce((sum, h) => sum + (now - new Date(h.createdAt).getTime()), 0) /
          warehouseHawbs.length /
          86_400_000) * 100,
      ) / 100
    : 0;
  const dispatchedToday = await prisma.houseAWB.count({
    where: {
      workflowStage: "DELIVERY",
      updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      deletedAt: null,
    },
  });
  const turnoverRate = totalInventory + dispatchedToday > 0
    ? Math.round((dispatchedToday / (totalInventory + dispatchedToday)) * 10000) / 100
    : 0;
  const totalCapacity = await prisma.warehouseZone
    .aggregate({ where: { isActive: true }, _sum: { capacity: true } })
    .then((r) => r._sum.capacity || 0);

  return apiSuccess({
    awaitingStorage,
    stored,
    waitingPayment,
    storedToday,
    invoiceGenerated,
    totalInventory,
    avgStorageTime,
    turnoverRate,
    totalCapacity,
  });
});
