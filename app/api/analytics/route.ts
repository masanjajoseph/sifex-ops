import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : new Date();

  const topCustomers = await prisma.billingRecord
    .groupBy({
      by: ["customerId"],
      where: { deletedAt: null },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    })
    .then(async (agg) => {
      const ids = agg.map((a) => a.customerId).filter(Boolean) as string[];
      const customers =
        ids.length > 0
          ? await prisma.customer.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true, code: true },
            })
          : [];
      return agg.map((a) => ({
        customerId: a.customerId,
        revenue: a._sum.totalAmount || 0,
        customer: customers.find((c) => c.id === a.customerId) || null,
      }));
    });

  const [topRoutes, topDestinations, warehouseUtilization, avgTransitTimeResult, avgProcessingTime, deliverySuccessRateResult, paymentCollection, lateDeliveriesResult] =
    await Promise.all([
      prisma.$queryRaw`
        SELECT
          os.code as origin_code,
          ds.code as destination_code,
          COUNT(*)::int as shipment_count,
          SUM(m.awb_pieces)::int as total_pieces,
          SUM(m.awb_weight)::float as total_weight
        FROM master_awbs m
        JOIN stations os ON os.id = m.origin_station_id
        JOIN stations ds ON ds.id = m.destination_station_id
        WHERE m.deleted_at IS NULL
          AND m.created_at >= ${dateFrom}
          AND m.created_at <= ${dateTo}
        GROUP BY os.code, ds.code
        ORDER BY shipment_count DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT
          s.code as station_code,
          s.name as station_name,
          COUNT(*)::int as shipment_count
        FROM master_awbs m
        JOIN stations s ON s.id = m.destination_station_id
        WHERE m.deleted_at IS NULL
          AND m.created_at >= ${dateFrom}
          AND m.created_at <= ${dateTo}
        GROUP BY s.code, s.name
        ORDER BY shipment_count DESC
        LIMIT 10
      `,
      prisma.warehouseInventory
        .count({ where: { status: { notIn: ["DISPATCHED"] }, deletedAt: null } })
        .then(async (currentStorage) => {
          const zones = await prisma.warehouseZone.aggregate({
            _sum: { capacity: true },
            where: { isActive: true },
          });
          const locations = await prisma.storageLocation.count({ where: { isActive: true } });
          return {
            currentStorage,
            totalCapacity: zones._sum.capacity || 0,
            totalLocations: locations,
            utilizationRate:
              zones._sum.capacity && zones._sum.capacity > 0
                ? Math.round((currentStorage / zones._sum.capacity) * 10000) / 100
                : 0,
          };
        }),
      prisma.$queryRaw`
        SELECT
          AVG(EXTRACT(EPOCH FROM (dt.delivered_at - m.departed_at)) / 86400)::float as avg_transit_days,
          COUNT(*)::int as sample_size
        FROM delivery_tasks dt
        JOIN master_awbs m ON m.id = dt.master_awb_id
        WHERE dt.status IN ('DELIVERED', 'COMPLETED')
          AND dt.delivered_at IS NOT NULL
          AND m.departed_at IS NOT NULL
          AND dt.delivered_at >= ${dateFrom}
          AND dt.delivered_at <= ${dateTo}
      `,
      prisma.$queryRaw`
        SELECT
          stage,
          AVG(duration_hours)::float as avg_hours,
          COUNT(*)::int as sample_size
        FROM (
          SELECT
            'DISPATCH' as stage,
            EXTRACT(EPOCH FROM (m.departed_at - m.created_at)) / 3600 as duration_hours
          FROM master_awbs m
          WHERE m.departed_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
          UNION ALL
          SELECT
            'TRANSIT' as stage,
            EXTRACT(EPOCH FROM (m.arrived_at - m.departed_at)) / 3600 as duration_hours
          FROM master_awbs m
          WHERE m.arrived_at IS NOT NULL AND m.departed_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
          UNION ALL
          SELECT
            'CLEARANCE' as stage,
            EXTRACT(EPOCH FROM (m.updated_at - m.arrived_at)) / 3600 as duration_hours
          FROM master_awbs m
          WHERE m.arrived_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
          UNION ALL
          SELECT
            'DELIVERY' as stage,
            EXTRACT(EPOCH FROM (dt.delivered_at - dt.created_at)) / 3600 as duration_hours
          FROM delivery_tasks dt
          WHERE dt.delivered_at IS NOT NULL AND dt.created_at >= ${dateFrom} AND dt.created_at <= ${dateTo}
        ) stages
        GROUP BY stage
      `,
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int as total,
          SUM(CASE WHEN status IN ('DELIVERED', 'COMPLETED') THEN 1 ELSE 0 END)::int as delivered,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int as cancelled
        FROM delivery_tasks
        WHERE deleted_at IS NULL
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
      `,
      prisma.billingRecord
        .aggregate({
          where: { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } },
          _sum: { totalAmount: true, paidAmount: true },
        })
        .then((r) => ({
          totalInvoiced: r._sum.totalAmount || 0,
          totalCollected: r._sum.paidAmount || 0,
          collectionRate:
            r._sum.totalAmount && r._sum.totalAmount > 0
              ? Math.round((r._sum.paidAmount! / r._sum.totalAmount) * 10000) / 100
              : 0,
        })),
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int as late_count
        FROM delivery_tasks dt
        JOIN master_awbs m ON m.id = dt.master_awb_id
        WHERE dt.status IN ('DELIVERED', 'COMPLETED')
          AND dt.delivered_at IS NOT NULL
          AND m.expected_arrival_date IS NOT NULL
          AND dt.delivered_at > m.expected_arrival_date
          AND dt.delivered_at >= ${dateFrom}
          AND dt.delivered_at <= ${dateTo}
      `,
    ]);

  const stageData = avgProcessingTime as any[];
  const operationalBottlenecks = stageData
    .sort((a: any, b: any) => b.avg_hours - a.avg_hours)
    .slice(0, 3);

  const dsr = deliverySuccessRateResult as any[];
  const ldr = lateDeliveriesResult as any[];
  const atr = avgTransitTimeResult as any[];

  return apiSuccess({
    topCustomers,
    topRoutes,
    topDestinations,
    warehouseUtilization,
    avgTransitTime: atr[0] || null,
    avgProcessingTime: stageData,
    deliverySuccessRate: {
      total: dsr[0]?.total || 0,
      delivered: dsr[0]?.delivered || 0,
      cancelled: dsr[0]?.cancelled || 0,
      successRate:
        dsr[0]?.total && dsr[0].total > 0
          ? Math.round((dsr[0].delivered / dsr[0].total) * 10000) / 100
          : 0,
    },
    paymentCollectionRate: paymentCollection,
    lateDeliveries: ldr[0]?.late_count || 0,
    operationalBottlenecks,
  });
});
