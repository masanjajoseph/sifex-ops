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


  const [
    activeShipments,
    warehouseItems,
    customsAlerts,
    flightsInTransit,
    recentScans,
    customsAlertList,
    flights,
    billingSummary,
    stationActivity,
    inventoryStats,
    revenueData,
    onTimeRate,
  ] = await Promise.all([
    prisma.masterAWB.count({
      where: {  deletedAt: null, cargoStatus: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
    prisma.warehouseInventory.count({
      where: {  deletedAt: null, status: { notIn: ["DISPATCHED"] } },
    }),
    prisma.customsDeclaration.count({
      where: {  deletedAt: null, status: { in: ["CUSTOMS_HOLD", "CUSTOMS_QUERY", "UNDER_REVIEW"] } },
    }),
    prisma.flight.count({
      where: {  deletedAt: null, status: { in: ["SCHEDULED", "BOARDING", "DEPARTED"] } },
    }),
    prisma.shipmentScan.findMany({
      where: {  },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customsDeclaration.findMany({
      where: {  deletedAt: null, status: { in: ["CUSTOMS_HOLD", "CUSTOMS_QUERY", "UNDER_REVIEW"] } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.flight.findMany({
      where: {  deletedAt: null, departureTime: { gte: new Date() } },
      orderBy: { departureTime: "asc" },
      take: 5,
    }),
    prisma.billingRecord.aggregate({
      where: {  deletedAt: null },
      _sum: { totalAmount: true, paidAmount: true, remainingAmount: true },
      _count: true,
    }),
    prisma.station.findMany({
      where: {  deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
    prisma.warehouseInventory.aggregate({
      where: {  deletedAt: null },
      _count: true,
    }),
    prisma.masterAWB.aggregate({
      where: {  deletedAt: null },
      _sum: { freight: true },
    }),
    prisma.masterAWB.count({
      where: {  deletedAt: null, cargoStatus: { in: ["DELIVERED", "POD_SIGNED"] } },
    }),
  ]);

  const totalMawb = await prisma.masterAWB.count({
    where: {  deletedAt: null },
  });

  const kpi = {
    activeShipments,
    warehouseItems,
    customsAlerts,
    flightsInTransit,
    revenue: revenueData._sum.freight || 0,
    onTimeRate: totalMawb > 0 ? Math.round((onTimeRate / totalMawb) * 1000) / 10 : 0,
    totalShipments: totalMawb,
  };

  const scanList = recentScans.map((s) => ({
    id: s.id,
    eventType: s.eventType,
    barcode: s.barcode,
    success: s.success,
    createdAt: s.createdAt.toISOString(),
    userId: s.userId,
  }));

  const alertItems = customsAlertList.map((a) => ({
    id: a.id,
    declarationNumber: a.declarationNumber,
    status: a.status,
    createdAt: a.submittedAt?.toISOString() || a.createdAt.toISOString(),
  }));

  const flightItems = flights.map((f) => ({
    id: f.id,
    flightNumber: f.flightNumber,
    status: f.status,
    departureTime: f.departureTime.toISOString(),
    totalCapacity: f.totalCapacity,
    availableCapacity: f.availableCapacity,
  }));

  const stationActivityData = await Promise.all(
    stationActivity.map(async (station) => {
      const shipments = await prisma.masterAWB.count({
        where: {
          
          deletedAt: null,
          OR: [{ originStationId: station.id }, { destinationStationId: station.id }],
        },
      });
      const scans = await prisma.shipmentScan.count({
        where: {  stationId: station.id },
      });
      return {
        station: station.code,
        name: station.name,
        shipments,
        scans,
      };
    })
  );

  const billing = {
    totalAmount: billingSummary._sum.totalAmount || 0,
    paidAmount: billingSummary._sum.paidAmount || 0,
    remainingAmount: billingSummary._sum.remainingAmount || 0,
    recordCount: billingSummary._count || 0,
  };

  return apiSuccess({
    kpi,
    recentScans: scanList,
    customsAlerts: alertItems,
    flights: flightItems,
    billing,
    stationActivity: stationActivityData,
    inventoryStats: { total: inventoryStats._count },
  });
});
