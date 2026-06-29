import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const stationId = searchParams.get("stationId") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (stationId) where.stationId = stationId;
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { houseAWB: { houseAWBNumber: { contains: search, mode: "insensitive" } } },
      { masterAWB: { masterAWBNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.warehouseInventory.findMany({
      where: where as any,
      include: { station: true, storageLocation: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouseInventory.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "warehouse:operation:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.stationId || !body.operation) {
    return apiError(new Error("stationId and operation are required"), 400);
  }

  const inventoryData: Record<string, unknown> = {
    
    stationId: body.stationId,
    storageLocationId: body.storageLocationId || null,
    houseAWBId: body.houseAWBId || null,
    masterAWBId: body.masterAWBId || null,
    quantity: body.quantity || 1,
    weight: body.weight || 0,
    volume: body.volume || 0,
  };

  switch (body.operation) {
    case "receive":
      inventoryData.status = "RECEIVED";
      inventoryData.receivedAt = new Date();
      break;
    case "store":
      inventoryData.status = "STORED";
      inventoryData.storedAt = new Date();
      break;
    case "pick":
      inventoryData.status = "PICKED";
      break;
    case "dispatch":
      inventoryData.status = "DISPATCHED";
      inventoryData.dispatchedAt = new Date();
      break;
    default:
      return apiError(new Error(`Unknown operation: ${body.operation}`), 400);
  }

  const inventory = await prisma.warehouseInventory.create({
    data: inventoryData as any,
    include: { station: true, storageLocation: true },
  });

  return apiSuccess(inventory, 201);
});
