import { NextRequest, NextResponse } from "next/server";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number");
  const barcode = searchParams.get("barcode");

  if (!number && !barcode) {
    return apiError(new Error("Query parameter 'number' or 'barcode' is required"), 400);
  }

  let entityType: string | null = null;
  let entityId: string | null = null;
  let entity: Record<string, unknown> | null = null;

  if (barcode) {
    const parcel = await prisma.parcel.findUnique({
      where: { barcode },
      include: { houseAWB: { include: { masterAWB: true } } },
    });
    if (parcel) {
      entityType = "Parcel";
      entityId = parcel.id;
      entity = parcel as unknown as Record<string, unknown>;
    }
  }

  if (!entity && number) {
    const masterAWB = await prisma.masterAWB.findFirst({
      where: { OR: [{ awbNumber: number }, { trackingNumber: number }], deletedAt: null },
    });
    if (masterAWB) {
      entityType = "MasterAWB";
      entityId = masterAWB.id;
      entity = masterAWB as unknown as Record<string, unknown>;
    }
  }

  if (!entity && number) {
    const houseAWB = await prisma.houseAWB.findFirst({
      where: { OR: [{ houseAWBNumber: number }, { trackingNumber: number }], deletedAt: null },
    });
    if (houseAWB) {
      entityType = "HouseAWB";
      entityId = houseAWB.id;
      entity = houseAWB as unknown as Record<string, unknown>;
    }
  }

  if (!entity) {
    return apiError(new NotFoundError("Shipment"), 404);
  }

  const timeline = await prisma.trackingEvent.findMany({
    where: { entityType: entityType!, entityId: entityId!, visibleToCustomer: true },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({
    entityType,
    entity,
    timeline,
  });
});
