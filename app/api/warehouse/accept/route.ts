import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CargoStatus, WarehouseStatus } from "@/types/cargo-domain";

const WarehouseAcceptSchema = z.object({
  masterAWBId: z.string().uuid().optional(),
  houseAWBId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }
  const userId = session.user!.id;

  const body = await req.json();
  const parsed = WarehouseAcceptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(new Error(parsed.error.issues.map(e => e.message).join(", ")), 400);
  }

  const data = parsed.data;
  const effectiveUserId = data.userId || userId;

  const result = await prisma.$transaction(async (tx) => {
    let entityType: string;
    let entityId: string;

    if (data.masterAWBId) {
      const masterAWB = await tx.masterAWB.findFirst({
        where: { id: data.masterAWBId,  deletedAt: null },
      });
      if (!masterAWB) {
        throw new Error("Master AWB not found");
      }
      entityType = "MasterAWB";
      entityId = masterAWB.id;

      await tx.masterAWB.update({
        where: { id: masterAWB.id },
        data: {
          cargoStatus: CargoStatus.RCS,
          warehouseStatus: WarehouseStatus.RECEIVED,
          currentStationId: masterAWB.originStationId,
          receivedAt: new Date(),
        },
      });
    } else if (data.houseAWBId) {
      const houseAWB = await tx.houseAWB.findFirst({
        where: { id: data.houseAWBId,  deletedAt: null },
      });
      if (!houseAWB) {
        throw new Error("House AWB not found");
      }
      entityType = "HouseAWB";
      entityId = houseAWB.id;

      await tx.houseAWB.update({
        where: { id: houseAWB.id },
        data: {
          cargoStatus: CargoStatus.RCS,
          warehouseStatus: WarehouseStatus.RECEIVED,
          receivedAt: new Date(),
        },
      });
    } else {
      throw new Error("Either masterAWBId or houseAWBId is required");
    }

    await tx.trackingEvent.create({
      data: {
        
        entityType,
        entityId,
        eventType: "WAREHOUSE_RECEIVED",
        status: CargoStatus.RCS,
        title: "Cargo Received at Warehouse",
        description: "Cargo has been physically received at the warehouse",
        userId: effectiveUserId,
        createdAt: new Date(),
      },
    });

    await tx.shipmentTimeline.create({
      data: {
        aggregateId: entityId,
        aggregateType: entityType as "MasterAWB" | "HouseAWB",
        eventType: "WAREHOUSE_RECEIVED",
        title: "Cargo Received at Warehouse",
        description: "Cargo has been physically received at the warehouse",
        userId: effectiveUserId,
        visibility: "CUSTOMER",
      },
    });

    const inventory = await tx.warehouseInventory.create({
      data: {
        
        stationId: "",
        storageLocationId: data.locationId || null,
        masterAWBId: data.masterAWBId || null,
        houseAWBId: data.houseAWBId || null,
        status: WarehouseStatus.RECEIVED,
        quantity: 1,
        weight: 0,
        volume: 0,
        receivedAt: new Date(),
      },
    });

    return { entityType, entityId, inventory };
  });

  return apiSuccess(result, 201);
});
