import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "revenue";
  const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : new Date();
  const branchId = searchParams.get("branchId");
  const customerId = searchParams.get("customerId");
  const stationId = searchParams.get("stationId");

  const mawbWhere: any = { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } };
  const hawbWhere: any = { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } };

  if (branchId) mawbWhere.branchId = branchId;
  if (customerId) hawbWhere.shipperId = customerId;
  if (stationId) mawbWhere.originStationId = stationId;

  switch (type) {
    case "revenue": {
      const billingAgg = await prisma.billingRecord.aggregate({
        where: { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } },
        _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
        _count: true,
      });

      const monthlyData = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          SUM(total_amount) as revenue,
          SUM(paid_amount) as collected
        FROM billing_records
        WHERE deleted_at IS NULL
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `;

      return apiSuccess({
        totalRevenue: billingAgg._sum.totalAmount || 0,
        totalCollected: billingAgg._sum.paidAmount || 0,
        totalOutstanding: billingAgg._sum.remainingAmount || 0,
        invoiceCount: billingAgg._count,
        monthly: monthlyData,
      });
    }

    case "export": {
      const [totalExports, byStatus, byRoute, byMonth] = await Promise.all([
        prisma.masterAWB.count({ where: mawbWhere }),
        prisma.masterAWB.groupBy({
          by: ["workflowStatus"],
          where: mawbWhere,
          _count: true,
        }),
        prisma.masterAWB.findMany({
          where: mawbWhere,
          select: {
            originStation: { select: { code: true } },
            destinationStation: { select: { code: true } },
            awbPieces: true,
            awbWeight: true,
          },
        }),
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count,
            SUM(awb_pieces) as pieces,
            SUM(awb_weight) as weight
          FROM master_awbs
          WHERE deleted_at IS NULL
            AND created_at >= ${dateFrom}
            AND created_at <= ${dateTo}
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `,
      ]);

      const routeStats = byRoute.reduce((acc: any, r: any) => {
        const key = `${r.originStation?.code || '?'} → ${r.destinationStation?.code || '?'}`;
        if (!acc[key]) acc[key] = { count: 0, pieces: 0, weight: 0 };
        acc[key].count++;
        acc[key].pieces += r.awbPieces;
        acc[key].weight += r.awbWeight;
        return acc;
      }, {});

      return apiSuccess({
        totalExports,
        byStatus: byStatus.map(s => ({ status: s.workflowStatus, count: s._count })),
        topRoutes: Object.entries(routeStats)
          .map(([route, stats]: any) => ({ route, ...stats }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10),
        monthly: byMonth,
      });
    }

    case "import": {
      const [totalImports, byStatus, byMonth] = await Promise.all([
        prisma.masterAWB.count({ where: { ...mawbWhere, workflowStatus: { in: ["RECEIVED", "DOCUMENTS_VERIFIED", "PIECES_VERIFIED", "WEIGHT_VERIFIED", "DAMAGE_INSPECTED", "WAREHOUSE_RECEIVING"] } } }),
        prisma.masterAWB.groupBy({
          by: ["workflowStatus"],
          where: { ...mawbWhere, workflowStatus: { in: ["RECEIVED", "DOCUMENTS_VERIFIED", "PIECES_VERIFIED", "WEIGHT_VERIFIED", "DAMAGE_INSPECTED", "WAREHOUSE_RECEIVING"] } },
          _count: true,
        }),
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
          FROM master_awbs
          WHERE deleted_at IS NULL
            AND workflow_status IN ('RECEIVED', 'VERIFIED', 'WAREHOUSE_RECEIVING')
            AND created_at >= ${dateFrom}
            AND created_at <= ${dateTo}
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `,
      ]);

      return apiSuccess({
        totalImports,
        byStatus: byStatus.map(s => ({ status: s.workflowStatus, count: s._count })),
        monthly: byMonth,
      });
    }

    case "warehouse": {
      const [totalInventory, byStatus, byMonth] = await Promise.all([
        prisma.warehouseInventory.count({ where: { deletedAt: null } }),
        prisma.warehouseInventory.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: true,
        }),
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
          FROM warehouse_inventories
          WHERE deleted_at IS NULL
            AND created_at >= ${dateFrom}
            AND created_at <= ${dateTo}
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `,
      ]);

      return apiSuccess({
        totalInventory,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        monthly: byMonth,
      });
    }

    case "delivery": {
      const [totalDeliveries, byStatus, byMonth, riderStats] = await Promise.all([
        prisma.deliveryAssignment.count(),
        prisma.deliveryAssignment.groupBy({
          by: ["status"],
          _count: true,
        }),
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
          FROM delivery_assignments
          WHERE created_at >= ${dateFrom}
            AND created_at <= ${dateTo}
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `,
        prisma.deliveryAssignment.groupBy({
          by: ["riderId"],
          where: { status: "DELIVERED" },
          _count: true,
        }),
      ]);

      return apiSuccess({
        totalDeliveries,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        monthly: byMonth,
        topRiders: riderStats.length,
      });
    }

    case "customers": {
      const topCustomers = await prisma.billingRecord.groupBy({
        by: ["customerId"],
        where: { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 10,
      });

      const customerDetails = await prisma.customer.findMany({
        where: { id: { in: topCustomers.map(c => c.customerId!).filter(Boolean) } },
        select: { id: true, name: true, code: true, email: true, phone: true },
      });

      const enriched = topCustomers.map(c => ({
        ...c,
        customer: customerDetails.find(cd => cd.id === c.customerId) || null,
      }));

      const totalCustomers = await prisma.customer.count({ where: { deletedAt: null } });

      return apiSuccess({
        totalCustomers,
        topCustomers: enriched,
      });
    }

    case "invoices": {
      const invoices = await prisma.billingRecord.findMany({
        where: { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo } },
        include: {
          customer: { select: { name: true, code: true } },
          houseAWB: { select: { houseAWBNumber: true } },
          billingCharges: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return apiSuccess({
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((s, i) => s + i.totalAmount, 0),
        totalPaid: invoices.reduce((s, i) => s + i.paidAmount, 0),
        totalOutstanding: invoices.reduce((s, i) => s + i.remainingAmount, 0),
        invoices,
      });
    }

    case "outstanding": {
      const outstanding = await prisma.billingRecord.findMany({
        where: { deletedAt: null, remainingAmount: { gt: 0 } },
        include: {
          customer: { select: { name: true, code: true, phone: true } },
          houseAWB: { select: { houseAWBNumber: true } },
        },
        orderBy: { remainingAmount: "desc" },
      });

      return apiSuccess({
        totalOutstanding: outstanding.reduce((s, i) => s + i.remainingAmount, 0),
        count: outstanding.length,
        records: outstanding,
      });
    }

    case "performance": {
      const [monthlyPerformance, yearlyPerformance] = await Promise.all([
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as total_shipments,
            SUM(CASE WHEN cargo_status IN ('DELIVERED', 'POD_SIGNED') THEN 1 ELSE 0 END) as delivered,
            SUM(freight) as revenue
          FROM master_awbs
          WHERE deleted_at IS NULL
            AND created_at >= ${dateFrom}
            AND created_at <= ${dateTo}
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `,
        prisma.$queryRaw`
          SELECT
            DATE_TRUNC('year', created_at) as year,
            COUNT(*) as total_shipments,
            SUM(freight) as revenue
          FROM master_awbs
          WHERE deleted_at IS NULL
            AND created_at >= ${new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
          GROUP BY DATE_TRUNC('year', created_at)
          ORDER BY year ASC
        `,
      ]);

      return apiSuccess({
        monthly: monthlyPerformance,
        yearly: yearlyPerformance,
      });
    }

    case "customer-performance": {
      const customerAgg = await prisma.billingRecord.groupBy({
        by: ["customerId"],
        where: {
          deletedAt: null,
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(customerId ? { customerId } : {}),
        },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 20,
      });

      const custIds = customerAgg.map(c => c.customerId).filter(Boolean) as string[];

      const [customers, shipmentCounts, onTimeData] = await Promise.all([
        prisma.customer.findMany({
          where: { id: { in: custIds } },
          select: { id: true, name: true, code: true, email: true },
        }),
        custIds.length > 0
          ? prisma.houseAWB.groupBy({
              by: ["shipperId"],
              where: { shipperId: { in: custIds }, deletedAt: null },
              _count: true,
            })
          : Promise.resolve([]),
        custIds.length > 0
          ? prisma.$queryRaw`
              SELECT
                h.shipper_id as customer_id,
                COUNT(dt.id)::int as total_deliveries,
                SUM(CASE WHEN dt.status IN ('DELIVERED','COMPLETED') AND dt.delivered_at <= m.expected_arrival_date THEN 1 ELSE 0 END)::int as on_time_deliveries
              FROM house_awbs h
              LEFT JOIN delivery_tasks dt ON dt.house_awb_id = h.id AND dt.deleted_at IS NULL
              LEFT JOIN master_awbs m ON m.id = h.master_awb_id
              WHERE h.shipper_id IN (${Prisma.join(custIds)})
                AND h.deleted_at IS NULL
              GROUP BY h.shipper_id
            `
          : Promise.resolve([]),
      ]);

      const shipmentMap = new Map(shipmentCounts.map(s => [s.shipperId, s._count]));
      const onTimeMap = new Map(
        (onTimeData as any[]).map(d => [d.customer_id, { total: d.total_deliveries, onTime: d.on_time_deliveries }]),
      );

      const enriched = customerAgg.map(c => {
        const ot = onTimeMap.get(c.customerId!);
        return {
          customerId: c.customerId,
          totalRevenue: c._sum.totalAmount || 0,
          totalCollected: c._sum.paidAmount || 0,
          shipmentCount: shipmentMap.get(c.customerId!) || 0,
          customer: customers.find(cust => cust.id === c.customerId) || null,
          onTimeRate: ot && ot.total > 0 ? Math.round((ot.onTime / ot.total) * 10000) / 100 : null,
        };
      });

      return apiSuccess({ customers: enriched });
    }

    case "rider-performance": {
      const riders = await prisma.rider.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          userId: true,
          vehicleType: true,
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          deliveryTasks: {
            where: {
              deletedAt: null,
              ...(dateFrom || dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}),
            },
            select: { status: true, deliveredAt: true, assignedAt: true },
          },
        },
      });

      const riderPerformance = riders.map(rider => {
        const tasks = rider.deliveryTasks;
        const total = tasks.length;
        const byStatus = tasks.reduce((acc: Record<string, number>, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const deliveryTimes = tasks
          .filter(t => t.deliveredAt && t.assignedAt)
          .map(t => (t.deliveredAt!.getTime() - t.assignedAt!.getTime()) / (1000 * 60 * 60));

        const avgDeliveryTime = deliveryTimes.length > 0
          ? deliveryTimes.reduce((s, t) => s + t, 0) / deliveryTimes.length
          : 0;

        return {
          riderId: rider.id,
          name: `${rider.user.firstName} ${rider.user.lastName}`,
          email: rider.user.email,
          phone: rider.user.phone,
          vehicleType: rider.vehicleType,
          totalTasks: total,
          byStatus,
          avgDeliveryTimeHours: Math.round(avgDeliveryTime * 100) / 100,
        };
      });

      return apiSuccess({
        riders: riderPerformance.sort((a, b) => b.totalTasks - a.totalTasks),
      });
    }

    case "branch-performance": {
      const branchData = await prisma.$queryRaw`
        SELECT
          b.id as branch_id,
          b.name as branch_name,
          b.code as branch_code,
          COUNT(DISTINCT m.id)::int as total_shipments,
          SUM(m.awb_pieces)::int as total_pieces,
          SUM(m.awb_weight)::float as total_weight,
          COALESCE(SUM(br.total_amount), 0)::float as total_revenue,
          COALESCE(SUM(br.paid_amount), 0)::float as total_collected
        FROM branches b
        LEFT JOIN stations s ON s.branch_id = b.id AND s.deleted_at IS NULL
        LEFT JOIN master_awbs m ON (m.origin_station_id = s.id OR m.destination_station_id = s.id)
          AND m.deleted_at IS NULL
          AND m.created_at >= ${dateFrom}
          AND m.created_at <= ${dateTo}
        LEFT JOIN billing_records br ON br.master_awb_id = m.id AND br.deleted_at IS NULL
        WHERE b.deleted_at IS NULL
        GROUP BY b.id, b.name, b.code
        ORDER BY total_shipments DESC
      `;

      return apiSuccess({ branches: branchData });
    }

    case "route-performance": {
      const routeData = await prisma.$queryRaw`
        SELECT
          os.code as origin_code,
          os.name as origin_name,
          ds.code as destination_code,
          ds.name as destination_name,
          COUNT(m.id)::int as total_shipments,
          SUM(m.awb_pieces)::int as total_pieces,
          SUM(m.awb_weight)::float as total_weight,
          AVG(EXTRACT(EPOCH FROM (COALESCE(m.arrived_at, m.updated_at) - m.departed_at)) / 86400)::float as avg_transit_days
        FROM master_awbs m
        JOIN stations os ON os.id = m.origin_station_id
        JOIN stations ds ON ds.id = m.destination_station_id
        WHERE m.deleted_at IS NULL
          AND m.created_at >= ${dateFrom}
          AND m.created_at <= ${dateTo}
        GROUP BY os.code, os.name, ds.code, ds.name
        ORDER BY total_shipments DESC
        LIMIT 50
      `;

      return apiSuccess({ routes: routeData });
    }

    case "sla-performance": {
      const [deliverySLA, stageTimes] = await Promise.all([
        prisma.$queryRaw`
          SELECT
            COUNT(*)::int as total_deliveries,
            SUM(CASE WHEN dt.delivered_at <= m.expected_arrival_date THEN 1 ELSE 0 END)::int as on_time_deliveries,
            AVG(EXTRACT(EPOCH FROM (dt.delivered_at - dt.created_at)) / 3600)::float as avg_processing_hours
          FROM delivery_tasks dt
          JOIN master_awbs m ON m.id = dt.master_awb_id
          WHERE dt.status IN ('DELIVERED', 'COMPLETED')
            AND dt.delivered_at IS NOT NULL
            AND dt.created_at >= ${dateFrom}
            AND dt.created_at <= ${dateTo}
        `,
        prisma.$queryRaw`
          SELECT
            stage,
            AVG(duration_hours)::float as avg_hours,
            COUNT(*)::int as sample_size
          FROM (
            SELECT
              'EXPORT' as stage,
              EXTRACT(EPOCH FROM (m.manifested_at - m.created_at)) / 3600 as duration_hours
            FROM master_awbs m
            WHERE m.manifested_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
            UNION ALL
            SELECT
              'TRANSIT' as stage,
              EXTRACT(EPOCH FROM (m.arrived_at - m.departed_at)) / 3600 as duration_hours
            FROM master_awbs m
            WHERE m.arrived_at IS NOT NULL AND m.departed_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
            UNION ALL
            SELECT
              'IMPORT' as stage,
              EXTRACT(EPOCH FROM (m.arrived_at - m.updated_at)) / 3600 as duration_hours
            FROM master_awbs m
            WHERE m.arrived_at IS NOT NULL AND m.created_at >= ${dateFrom} AND m.created_at <= ${dateTo}
          ) stages
          GROUP BY stage
        `,
      ]);

      const sla = deliverySLA as any[];
      const onTimeRate = sla.length > 0 && sla[0].total_deliveries > 0
        ? Math.round((sla[0].on_time_deliveries / sla[0].total_deliveries) * 10000) / 100
        : 0;

      return apiSuccess({
        onTimeDeliveryRate: onTimeRate,
        totalDeliveries: sla[0]?.total_deliveries || 0,
        onTimeDeliveries: sla[0]?.on_time_deliveries || 0,
        avgProcessingHours: sla[0]?.avg_processing_hours || 0,
        stageBreakdown: stageTimes,
      });
    }

    default:
      return apiError(new AppError(`Unknown report type: ${type}`, 400, "INVALID_REPORT_TYPE"));
  }
});
