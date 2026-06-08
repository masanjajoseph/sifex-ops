import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ShipmentType, PaymentMode, CargoStatus } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    deletedAt: null,
  };
  if (status) where.cargoStatus = status;
  if (search) {
    where.OR = [
      { awbNumber: { contains: search, mode: "insensitive" } },
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { senderName: { contains: search, mode: "insensitive" } },
      { receiverName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.masterAWB.findMany({
      where: where as any,
      include: { houseAWBs: true, originStation: true, destinationStation: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.masterAWB.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();

  const masterAWB = await prisma.masterAWB.create({
    data: {
      organizationId: session.user.organizationId,
      awbNumber: body.awbNumber,
      trackingNumber: body.trackingNumber || body.awbNumber,
      shipmentType: body.shipmentType || ShipmentType.CAN_GUANGZHOU,
      paymentMode: body.paymentMode || PaymentMode.PP,
      currency: body.currency || "USD",
      customsValue: body.customsValue || 0,
      originStationId: body.originStationId,
      destinationStationId: body.destinationStationId,
      senderName: body.senderName || "",
      senderAddress: body.senderAddress || "",
      senderCompany: body.senderCompany,
      senderPhone: body.senderPhone,
      senderCity: body.senderCity,
      senderCountry: body.senderCountry,
      receiverName: body.receiverName || "",
      receiverAddress: body.receiverAddress || "",
      receiverCompany: body.receiverCompany,
      receiverPhone: body.receiverPhone,
      receiverCity: body.receiverCity,
      receiverCountry: body.receiverCountry,
      awbPieces: body.awbPieces || 0,
      awbWeight: body.awbWeight || 0,
      volume: body.volume || 0,
      chargeableWeight: body.chargeableWeight || 0,
      volumeWeight: body.volumeWeight || 0,
      description: body.description,
      orderNumber: body.orderNumber,
      cargoStatus: CargoStatus.INITIATED,
      airlineId: body.airlineId || "",
      flightNumber: body.flightNumber || "",
      departureTime: body.departureTime ? new Date(body.departureTime) : new Date(),
      arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : new Date(),
    },
    include: { houseAWBs: true, originStation: true, destinationStation: true },
  });

  return apiSuccess(masterAWB, 201);
});
