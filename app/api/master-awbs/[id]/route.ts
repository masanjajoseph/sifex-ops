import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const [masterAWB, billingRecords] = await Promise.all([
    prisma.masterAWB.findFirst({
      where: { id,  deletedAt: null },
      include: {
        houseAWBs: { where: { deletedAt: null }, include: { parcels: true } },
        originStation: true,
        destinationStation: true,
        currentStation: true,
      },
    }),
    prisma.billingRecord.findMany({
      where: { masterAWBId: id,  deletedAt: null },
      include: { billingCharges: true, payments: true },
    }),
  ]);

  if (!masterAWB) {
    return apiError(new NotFoundError("Master AWB"), 404);
  }

  const hawbSum = masterAWB.houseAWBs.reduce(
    (acc, h) => ({ pieces: acc.pieces + h.pieces, weight: acc.weight + h.weight }),
    { pieces: 0, weight: 0 },
  );
  if (masterAWB.awbPieces !== hawbSum.pieces || masterAWB.awbWeight !== hawbSum.weight) {
    const updated = await prisma.masterAWB.update({
      where: { id },
      data: { awbPieces: hawbSum.pieces, awbWeight: hawbSum.weight },
      include: {
        houseAWBs: { where: { deletedAt: null }, include: { parcels: true } },
        originStation: true,
        destinationStation: true,
        currentStation: true,
      },
    });
    return apiSuccess({ ...updated, billingRecords });
  }

  return apiSuccess({ ...masterAWB, billingRecords });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.masterAWB.findFirst({
    where: { id,  deletedAt: null },
    include: { houseAWBs: { where: { deletedAt: null }, select: { id: true } } },
  });

  if (!existing) {
    return apiError(new NotFoundError("Master AWB"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "cargoStatus", "warehouseStatus", "billingStatus",
    "airlineId", "flightNumber", "departureTime", "arrivalTime",
    "currentStationId",
    "awbPieces", "awbWeight", "volume", "chargeableWeight",
    "description", "orderNumber",
    "senderName", "senderAddress", "senderCompany", "senderPhone",
    "receiverName", "receiverAddress", "receiverCompany", "receiverPhone",
    "manifestId", "manifestNumber",
    "customsDeclarationId", "customsStatus",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      if (key === "departureTime" || key === "arrivalTime") {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key];
      }
    }
  }

  if (data.cargoStatus && existing.cargoStatus !== data.cargoStatus) {
    const newStatus = data.cargoStatus as CargoStatus;
    await prisma.houseAWB.updateMany({
      where: { masterAWBId: id, deletedAt: null },
      data: { cargoStatus: newStatus },
    });

    const hawbEvents = (existing as any).houseAWBs?.map((h: any) => ({
      entityType: "HouseAWB" as const,
      entityId: h.id,
      eventType: String(newStatus),
      status: newStatus,
      title: `Status changed to ${newStatus.replace(/_/g, ' ')}`,
      userId: session.user.id!,
      createdAt: new Date(),
    })) || [];

    await prisma.trackingEvent.createMany({
      data: [
        {
          entityType: "MasterAWB",
          entityId: id,
          eventType: String(newStatus),
          status: newStatus,
          title: `Status changed to ${newStatus.replace(/_/g, ' ')}`,
          userId: session.user.id!,
          createdAt: new Date(),
        },
        ...hawbEvents,
      ],
    });
  }

  if (data.cargoStatus === 'RELEASED' && existing.cargoStatus !== 'RELEASED') {
    const hawbs = await prisma.houseAWB.findMany({
      where: { masterAWBId: id, deletedAt: null },
    });
    for (const hawb of hawbs) {
      const existingBill = await prisma.billingRecord.findFirst({
        where: { houseAWBId: hawb.id, deletedAt: null },
      });
      if (existingBill) continue;

      await prisma.billingRecord.create({
        data: {
          createdById: session.user.id,
          houseAWBId: hawb.id,
          masterAWBId: id,
          customerId: hawb.shipperId,
          status: 'DRAFT',
          totalAmount: hawb.freight,
          currency: hawb.currency,
          billingCharges: {
            create: [
              { type: 'AIRLINE_FREIGHT', amount: hawb.freight, currency: hawb.currency, description: `Air freight (${hawb.freightRate}/kg × ${hawb.chargeableWeight} kg)` },
            ],
          },
        },
      });

      await prisma.houseAWB.update({
        where: { id: hawb.id },
        data: { billingStatus: 'DRAFT' as any },
      });
    }
    data.billingStatus = 'DRAFT';
  }

  const updated = await prisma.masterAWB.update({
    where: { id },
    data: data as any,
    include: {
      houseAWBs: { where: { deletedAt: null }, include: { parcels: true } },
      originStation: true,
      destinationStation: true,
    },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.masterAWB.findFirst({
    where: { id,  deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Master AWB"), 404);
  }

  await prisma.masterAWB.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
