import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const status = searchParams.get("status");
  const houseAWBId = searchParams.get("houseAWBId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (houseAWBId) where.houseAWBId = houseAWBId;

  const [items, total] = await Promise.all([
    prisma.deliveryNote.findMany({
      where: where as any,
      include: {
        houseAWB: { select: { houseAWBNumber: true, trackingNumber: true, pieces: true, weight: true, cargoStatus: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.deliveryNote.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  if (!body.houseAWBId) return apiError(new Error("houseAWBId is required"), 400);
  if (!body.recipientName) return apiError(new Error("recipientName is required"), 400);

  const hawb = await prisma.houseAWB.findFirst({ where: { id: body.houseAWBId, deletedAt: null } });
  if (!hawb) return apiError(new Error("House AWB not found"), 404);

  const note = await prisma.deliveryNote.create({
    data: {
      houseAWBId: body.houseAWBId,
      deliveryType: body.deliveryType || "DELIVERY",
      status: body.signature ? "SIGNED" : "PENDING",
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      recipientIdType: body.recipientIdType,
      recipientIdNumber: body.recipientIdNumber,
      relation: body.relation || "SELF",
      representativeName: body.representativeName,
      signature: body.signature,
      signedAt: body.signature ? new Date() : null,
      notes: body.notes,
      createdById: session.user.id!,
    },
    include: {
      houseAWB: { select: { houseAWBNumber: true, trackingNumber: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  const isPickup = body.deliveryType === "PICKUP";
  await prisma.houseAWB.update({
    where: { id: body.houseAWBId },
    data: { cargoStatus: isPickup ? CargoStatus.PICKED_UP : CargoStatus.OUT_FOR_DELIVERY },
  });

  await prisma.trackingEvent.create({
    data: {
      entityType: "HouseAWB",
      entityId: body.houseAWBId,
      eventType: isPickup ? "PICKED_UP" : "OUT_FOR_DELIVERY",
      status: isPickup ? CargoStatus.PICKED_UP : CargoStatus.OUT_FOR_DELIVERY,
      title: isPickup ? "Picked up by customer" : "Out for delivery",
      description: `Delivery note created. Recipient: ${body.recipientName}`,
      userId: session.user.id!,
      createdAt: new Date(),
    },
  });

  return apiSuccess(note, 201);
});
