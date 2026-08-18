import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const departmentCode = session.user.departmentId
    ? (await prisma.department.findUnique({ where: { id: session.user.departmentId } }))?.code
    : null;

  const activeShipments = prisma.masterAWB.count({ where: { deletedAt: null, cargoStatus: { notIn: ["DELIVERED", "CANCELLED"] } } });
  const warehouseItems = prisma.warehouseInventory.count({ where: { deletedAt: null, status: { notIn: ["DISPATCHED"] } } });
  const customsAlertsCount = prisma.customsDeclaration.count({ where: { deletedAt: null, status: { in: ["CUSTOMS_HOLD", "CUSTOMS_QUERY", "UNDER_REVIEW"] } } });
  const flightsInTransit = prisma.flight.count({ where: { deletedAt: null, status: { in: ["SCHEDULED", "BOARDING", "DEPARTED"] } } });
  const recentScans = prisma.shipmentScan.findMany({ where: {}, orderBy: { createdAt: "desc" }, take: 5 });
  const customsAlertList = prisma.customsDeclaration.findMany({ where: { deletedAt: null, status: { in: ["CUSTOMS_HOLD", "CUSTOMS_QUERY", "UNDER_REVIEW"] } }, orderBy: { submittedAt: "desc" }, take: 5 });
  const flights = prisma.flight.findMany({ where: { deletedAt: null, departureTime: { gte: new Date() } }, orderBy: { departureTime: "asc" }, take: 5 });
  const billingSummary = prisma.billingRecord.aggregate({ where: { deletedAt: null }, _sum: { totalAmount: true, paidAmount: true, remainingAmount: true }, _count: true });
  const stationActivity = prisma.station.findMany({ where: { deletedAt: null }, select: { id: true, code: true, name: true } });
  const inventoryStats = prisma.warehouseInventory.aggregate({ where: { deletedAt: null }, _count: true });
  const revenueData = prisma.masterAWB.aggregate({ where: { deletedAt: null }, _sum: { freight: true } });
  const onTimeRate = prisma.masterAWB.count({ where: { deletedAt: null, cargoStatus: { in: ["DELIVERED", "POD_SIGNED"] } } });
  const totalMawb = prisma.masterAWB.count({ where: { deletedAt: null } });
  const exportDraftCount = prisma.masterAWB.count({ where: { workflowStatus: "DRAFT", deletedAt: null } });
  const exportPendingHawb = prisma.masterAWB.count({ where: { workflowStatus: "VALIDATED", deletedAt: null } });
  const importWaitingVerification = prisma.masterAWB.count({ where: { workflowStatus: "RECEIVED", deletedAt: null } });
  const warehouseAwaitingStorage = prisma.masterAWB.count({ where: { workflowStatus: "WAREHOUSE_RECEIVING", deletedAt: null } });
  const warehouseWaitingPayment = prisma.billingRecord.count({ where: { status: "WAITING_PAYMENT", deletedAt: null } });
  const billingOutstanding = prisma.billingRecord.aggregate({ where: { deletedAt: null }, _sum: { remainingAmount: true } });
  const waitingDeliveryQ = prisma.houseAWB.count({ where: { workflowStatus: "WAITING_DELIVERY", deletedAt: null } });
  const deliveryActiveQ = prisma.deliveryAssignment.count({ where: { status: { in: ["RIDER_ASSIGNED", "OUT_FOR_DELIVERY"] } } });

  const results = await Promise.all([
    activeShipments, warehouseItems, customsAlertsCount, flightsInTransit,
    recentScans, customsAlertList, flights, billingSummary,
    stationActivity, inventoryStats, revenueData, onTimeRate, totalMawb,
    exportDraftCount, exportPendingHawb, importWaitingVerification,
    warehouseAwaitingStorage, warehouseWaitingPayment, billingOutstanding,
    waitingDeliveryQ, deliveryActiveQ,
  ]);

  const [
    activeShipmentsR, warehouseItemsR, customsAlertsCountR, flightsInTransitR,
    recentScansR, customsAlertListR, flightsR, billingSummaryR,
    stationActivityR, inventoryStatsR, revenueDataR, onTimeRateR, totalMawbR,
    exportDraftCountR, exportPendingHawbR, importWaitingVerificationR,
    warehouseAwaitingStorageR, warehouseWaitingPaymentR, billingOutstandingR,
    waitingDeliveryR, deliveryActiveR,
  ] = results;

  const kpi = {
    activeShipments: activeShipmentsR,
    warehouseItems: warehouseItemsR,
    customsAlerts: customsAlertsCountR,
    flightsInTransit: flightsInTransitR,
    revenue: revenueDataR._sum.freight || 0,
    onTimeRate: totalMawbR > 0 ? Math.round((onTimeRateR / totalMawbR) * 1000) / 10 : 0,
    totalShipments: totalMawbR,
  };

  const moduleKpis: Record<string, any> = {
    EXPORT: { draftCount: exportDraftCountR, pendingHawb: exportPendingHawbR, activeShipments: activeShipmentsR },
    IMPORT: { waitingVerification: importWaitingVerificationR, totalArrived: importWaitingVerificationR },
    WAREHOUSE: { awaitingStorage: warehouseAwaitingStorageR, waitingPayment: warehouseWaitingPaymentR, totalInventory: inventoryStatsR._count },
    BILLING: { waitingPayment: warehouseWaitingPaymentR, outstanding: billingOutstandingR._sum.remainingAmount || 0 },
    DELIVERY: { waitingDelivery: waitingDeliveryR, activeDeliveries: deliveryActiveR },
  };

  const scanList = recentScansR.map((s) => ({
    id: s.id, eventType: s.eventType, barcode: s.barcode,
    success: s.success, createdAt: s.createdAt.toISOString(), userId: s.userId,
  }));

  const alertItems = customsAlertListR.map((a) => ({
    id: a.id, declarationNumber: a.declarationNumber, status: a.status,
    createdAt: a.submittedAt?.toISOString() || a.createdAt.toISOString(),
  }));

  const flightItems = flightsR.map((f) => ({
    id: f.id, flightNumber: f.flightNumber, status: f.status,
    departureTime: f.departureTime.toISOString(),
    totalCapacity: f.totalCapacity, availableCapacity: f.availableCapacity,
  }));

  const stationActivityData = await Promise.all(
    stationActivityR.map(async (station) => {
      const [shipments, scans] = await Promise.all([
        prisma.masterAWB.count({ where: { deletedAt: null, OR: [{ originStationId: station.id }, { destinationStationId: station.id }] } }),
        prisma.shipmentScan.count({ where: { stationId: station.id } }),
      ]);
      return { station: station.code, name: station.name, shipments, scans };
    })
  );

  const billing = {
    totalAmount: billingSummaryR._sum.totalAmount || 0,
    paidAmount: billingSummaryR._sum.paidAmount || 0,
    remainingAmount: billingSummaryR._sum.remainingAmount || 0,
    recordCount: billingSummaryR._count || 0,
  };

  return apiSuccess({
    kpi,
    moduleKpis,
    userDepartment: departmentCode,
    recentScans: scanList,
    customsAlerts: alertItems,
    flights: flightItems,
    billing,
    stationActivity: stationActivityData,
    inventoryStats: { total: inventoryStatsR._count },
  });
});
