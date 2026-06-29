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
  const limit = parseInt(searchParams.get("limit") || "20");
  const eventType = searchParams.get("eventType") || undefined;
  const barcode = searchParams.get("barcode") || undefined;
  const houseAWBId = searchParams.get("houseAWBId") || undefined;

  const where: Record<string, unknown> = {
    
  };
  if (eventType) where.eventType = eventType;
  if (barcode) where.barcode = barcode;
  if (houseAWBId) where.houseAWBId = houseAWBId;

  const [items, total] = await Promise.all([
    prisma.shipmentScan.findMany({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.shipmentScan.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:scan:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.barcode || !body.eventType) {
    return apiError(new Error("barcode and eventType are required"), 400);
  }

  let houseAWBId = body.houseAWBId;
  let masterAWBId = body.masterAWBId;

  if (!houseAWBId && !masterAWBId) {
    const parcel = await prisma.parcel.findUnique({ where: { barcode: body.barcode } });
    if (parcel?.houseAWBId) {
      houseAWBId = parcel.houseAWBId;
    }
  }

  const scan = await prisma.shipmentScan.create({
    data: {
      
      eventType: body.eventType,
      barcode: body.barcode,
      houseAWBId,
      masterAWBId,
      userId: session.user.id,
      stationId: body.stationId,
      latitude: body.latitude,
      longitude: body.longitude,
      address: body.address,
      success: body.success !== false,
      errorMessage: body.errorMessage,
      metadata: body.metadata || {},
    },
  });

  return apiSuccess(scan, 201);
});
