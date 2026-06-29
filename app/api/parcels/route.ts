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

  const { searchParams } = new URL(req.url);
  const houseAWBId = searchParams.get("houseAWBId") || undefined;
  const barcode = searchParams.get("barcode") || undefined;
  const trackingNumber = searchParams.get("trackingNumber") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};
  if (houseAWBId) where.houseAWBId = houseAWBId;
  if (barcode) where.barcode = barcode;
  if (trackingNumber) where.parcelTrackingNumber = trackingNumber;
  if (search) {
    where.OR = [
      { barcode: { contains: search, mode: "insensitive" } },
      { parcelTrackingNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.parcel.findMany({
    where: where as any,
    include: { warehouseLocation: true, houseAWB: { include: { masterAWB: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(items);
});

async function updateHawbAndMawbTotals(houseAWBId: string) {
  const hawb = await prisma.houseAWB.findUnique({
    where: { id: houseAWBId },
    select: { masterAWBId: true },
  });
  if (!hawb) return;

  const parcelAgg = await prisma.parcel.aggregate({
    where: { houseAWBId },
    _sum: { quantity: true, actualWeight: true },
  });

  await prisma.houseAWB.update({
    where: { id: houseAWBId },
    data: {
      pieces: parcelAgg._sum.quantity || 0,
      weight: parcelAgg._sum.actualWeight || 0,
    },
  });

  if (hawb.masterAWBId) {
    const hawbAgg = await prisma.houseAWB.aggregate({
      where: { masterAWBId: hawb.masterAWBId, deletedAt: null },
      _sum: { pieces: true, weight: true },
    });
    await prisma.masterAWB.update({
      where: { id: hawb.masterAWBId },
      data: {
        awbPieces: hawbAgg._sum.pieces || 0,
        awbWeight: hawbAgg._sum.weight || 0,
      },
    });
  }
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();

  const parcel = await prisma.parcel.create({
    data: {
      houseAWBId: body.houseAWBId,
      parcelTrackingNumber: body.parcelTrackingNumber,
      barcode: body.barcode,
      qrCode: body.qrCode,
      serialNumber: body.serialNumber,
      description: body.description || "",
      quantity: body.quantity || 1,
      actualWeight: body.actualWeight || 0,
      volumetricWeight: body.volumetricWeight || 0,
      length: body.length || 0,
      width: body.width || 0,
      height: body.height || 0,
      volume: body.volume || 0,
      value: body.value || 0,
      hsCode: body.hsCode || "",
      packageType: body.packageType || "BOX",
      condition: body.condition || "GOOD",
      warehouseLocationId: body.warehouseLocationId || null,
    },
    include: { warehouseLocation: true, houseAWB: { include: { masterAWB: true } } },
  });

  await updateHawbAndMawbTotals(body.houseAWBId);

  return apiSuccess(parcel, 201);
});
