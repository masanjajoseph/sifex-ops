import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface LiveOperationsMetrics {
  activeShipments: number;
  flightsInTransit: number;
  warehouseCapacity: number;
  deliverySuccess: number;
}

export const GET = withErrorHandler(async () => {
  const [activeShipments, flightsInTransit, totalInventory, zoneCapacity, delivered, totalDeliveries] =
    await Promise.all([
      prisma.masterAWB.count({
        where: {
          deletedAt: null,
          cargoStatus: { notIn: ["DELIVERED", "CANCELLED", "POD_SIGNED"] as any },
        },
      }),
      prisma.flight.count({
        where: { deletedAt: null, status: { in: ["DEPARTED", "BOARDING", "IN_TRANSIT"] } },
      }),
      prisma.warehouseInventory.count({
        where: { deletedAt: null, status: { notIn: ["DISPATCHED"] as any } },
      }),
      prisma.warehouseZone
        .aggregate({ where: { isActive: true }, _sum: { capacity: true } })
        .then((r) => r._sum.capacity || 0),
      prisma.deliveryTask.count({
        where: { deletedAt: null, status: { in: ["DELIVERED", "COMPLETED"] as any } },
      }),
      prisma.deliveryTask.count({
        where: { deletedAt: null, status: { not: "CANCELLED" as any } },
      }),
    ]);

  const capacityTotal =
    zoneCapacity ||
    (await prisma.storageLocation.count({ where: { isActive: true, deletedAt: null } }));

  const warehouseCapacity =
    capacityTotal > 0 ? Math.min(100, Math.round((totalInventory / capacityTotal) * 100)) : 0;

  const deliverySuccess =
    totalDeliveries > 0 ? Math.round((delivered / totalDeliveries) * 1000) / 10 : 0;

  return apiSuccess<LiveOperationsMetrics>({
    activeShipments,
    flightsInTransit,
    warehouseCapacity,
    deliverySuccess,
  });
});