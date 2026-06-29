import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const body = await req.json();
  const { destinationStationId, awbNumber } = body;

  const hawb = await prisma.houseAWB.findFirst({
    where: { id,  deletedAt: null },
    include: { masterAWB: true, parcels: true },
  });

  if (!hawb) {
    return apiError(new Error("House AWB not found"), 404);
  }

  const srcMawb = hawb.masterAWB;
  if (!srcMawb) {
    return apiError(new Error("House AWB is not linked to any Master AWB"), 400);
  }

  const destStation = await prisma.station.findUnique({ where: { id: destinationStationId } });
  if (!destStation) {
    return apiError(new Error("Destination station not found"), 404);
  }

  const newShipmentType = `${destStation.code}_${destStation.name.toUpperCase().replace(/\s+/g, '_')}`;

  const [freightRate] = await prisma.freightRate.findMany({
    where: { shipmentType: newShipmentType as any, isActive: true,  },
    take: 1,
    orderBy: { createdAt: "desc" },
  });

  const ratePerKg = freightRate ? Number(freightRate.ratePerKg) || 0 : 0;
  const newChargeableWeight = Math.max(
    hawb.parcels?.reduce((s: number, p: any) => s + (Number(p.actualWeight) || 0), 0) || hawb.weight,
    hawb.volumeWeight || 0,
  );
  const newFreight = ratePerKg * newChargeableWeight;

  let destMawb = await prisma.masterAWB.findFirst({
    where: {
      
      destinationStationId,
      originStationId: srcMawb.originStationId,
      airlineId: srcMawb.airlineId,
      flightNumber: srcMawb.flightNumber,
      departureTime: srcMawb.departureTime,
      deletedAt: null,
      cargoStatus: { in: ["INITIATED", "ACCEPTED", "RCS"] },
    },
  });

  if (!destMawb) {
    destMawb = await prisma.masterAWB.create({
      data: {
        createdById: session.user.id,
        awbNumber: awbNumber || `MAWB-HKG-${Date.now()}`,
        trackingNumber: `TRK-HKG-${Date.now()}`,
        originStationId: srcMawb.originStationId,
        destinationStationId,
        airlineId: srcMawb.airlineId,
        flightNumber: srcMawb.flightNumber,
        departureTime: srcMawb.departureTime,
        arrivalTime: srcMawb.arrivalTime,
        senderName: srcMawb.senderName,
        senderAddress: srcMawb.senderAddress || "",
        receiverName: "Hong Kong Transfer",
        receiverAddress: "",
        shipmentType: newShipmentType as any,
        paymentMode: srcMawb.paymentMode,
        currency: freightRate?.currency || srcMawb.currency,
        customsValue: 0,
        awbPieces: 0,
        awbWeight: 0,
      },
    });
  }

  await prisma.houseAWB.update({
    where: { id },
    data: {
      masterAWBId: destMawb.id,
      shipmentType: newShipmentType as any,
      freightRate: ratePerKg,
      freight: newFreight,
      chargeableWeight: newChargeableWeight,
      currency: freightRate?.currency || hawb.currency,
    },
  });

  const srcAgg = await prisma.houseAWB.aggregate({
    where: { masterAWBId: srcMawb.id, deletedAt: null },
    _sum: { pieces: true, weight: true },
  });
  await prisma.masterAWB.update({
    where: { id: srcMawb.id },
    data: { awbPieces: srcAgg._sum.pieces || 0, awbWeight: srcAgg._sum.weight || 0 },
  });

  const dstAgg = await prisma.houseAWB.aggregate({
    where: { masterAWBId: destMawb.id, deletedAt: null },
    _sum: { pieces: true, weight: true },
  });
  await prisma.masterAWB.update({
    where: { id: destMawb.id },
    data: { awbPieces: dstAgg._sum.pieces || 0, awbWeight: dstAgg._sum.weight || 0 },
  });

  await prisma.trackingEvent.create({
    data: {
      entityType: "HouseAWB",
      entityId: id,
      eventType: "TRANSFERRED",
      status: hawb.cargoStatus,
      title: `Transferred to ${destStation.code}`,
      userId: session.user.id!,
      createdAt: new Date(),
    },
  });

  return apiSuccess({ source: srcMawb, destination: destMawb });
});
