import { createWorker, enqueue } from "..";
import { prisma } from "@/lib/prisma";

export const analyticsWorker = createWorker("analytics", async (job) => {
  const { type, period } = job.data as { type: string; period: string };

  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 1;
  const since = new Date(Date.now() - days * 86400000);

  switch (type) {
    case "shipment-volumes": {
      const shipments = await prisma.masterAWB.count({
        where: { createdAt: { gte: since }, deletedAt: null },
      });
      const houseAwbs = await prisma.houseAWB.count({
        where: { createdAt: { gte: since }, deletedAt: null },
      });
      const revenues = await prisma.billingRecord.aggregate({
        _sum: { paidAmount: true },
        where: { fullyPaidAt: { gte: since }, deletedAt: null },
      });
      const key = `analytics:shipments:${period}`;
      const { cache } = await import("@/lib/cache");
      await cache.setex(key, 86400, {
        shipments,
        houseAwbs,
        revenue: revenues._sum.paidAmount || 0,
        period,
        generatedAt: new Date().toISOString(),
      });
      break;
    }
    case "status-distribution": {
      const byStatus = await prisma.masterAWB.groupBy({
        by: ["cargoStatus"],
        _count: { id: true },
        where: { deletedAt: null },
      });
      const key = `analytics:status-distribution:${period}`;
      const { cache } = await import("@/lib/cache");
      await cache.setex(key, 86400, {
        byStatus,
        period,
        generatedAt: new Date().toISOString(),
      });
      break;
    }
    case "billing-summary": {
      const paid = await prisma.billingRecord.count({
        where: { status: "PAID", deletedAt: null, fullyPaidAt: { gte: since } },
      });
      const unpaid = await prisma.billingRecord.count({
        where: { status: "UNPAID", deletedAt: null },
      });
      const totalBilled = await prisma.billingRecord.aggregate({
        _sum: { totalAmount: true },
        where: { deletedAt: null, createdAt: { gte: since } },
      });
      const key = `analytics:billing:${period}`;
      const { cache } = await import("@/lib/cache");
      await cache.setex(key, 86400, {
        paid,
        unpaid,
        totalBilled: totalBilled._sum.totalAmount || 0,
        period,
        generatedAt: new Date().toISOString(),
      });
      break;
    }
  }
});

export async function enqueueAnalyticsRefresh(type: string, period: string) {
  return enqueue("analytics", "refresh-analytics", { type, period });
}
