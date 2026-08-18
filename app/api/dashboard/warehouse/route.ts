import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const awaitingStorage = await prisma.masterAWB.count({
    where: { workflowStatus: "WAREHOUSE_RECEIVING", deletedAt: null },
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

  const totalInventory = await prisma.warehouseInventory.count({
    where: { status: { notIn: ["DISPATCHED"] }, deletedAt: null },
  });

  const [avgStorageTime, turnoverRate, totalCapacity] = await Promise.all([
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(wi.dispatched_at, NOW()) - wi.stored_at)) / 86400)::float as avg_days
      FROM warehouse_inventories wi
      WHERE wi.stored_at IS NOT NULL AND wi.deleted_at IS NULL
    `.then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      return row?.avg_days ? Math.round(row.avg_days * 100) / 100 : 0;
    }),
    prisma.$queryRaw`
      SELECT
        (COUNT(*) FILTER (WHERE status = 'DISPATCHED')::float /
          NULLIF(COUNT(*)::float, 0)) * 100 as rate
      FROM warehouse_inventories
      WHERE deleted_at IS NULL
    `.then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      return row?.rate ? Math.round(row.rate * 100) / 100 : 0;
    }),
    prisma.warehouseZone.aggregate({
      where: { isActive: true },
      _sum: { capacity: true },
    }).then(r => r._sum.capacity || 0),
  ]);

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
