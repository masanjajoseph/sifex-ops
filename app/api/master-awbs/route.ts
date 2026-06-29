import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ShipmentType, PaymentMode, CargoStatus, WorkflowStage } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const scope = searchParams.get("scope") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) where.cargoStatus = status;
  if (scope === "export") {
    where.workflowStage = WorkflowStage.EXPORT;
  } else if (scope === "import") {
    where.workflowStage = WorkflowStage.IMPORT;
  } else if (scope === "warehouse") {
    where.workflowStage = WorkflowStage.WAREHOUSE;
  } else if (scope === "delivery") {
    where.workflowStage = WorkflowStage.DELIVERY;
  }
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
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();

  if (!body.originStationId || !body.destinationStationId) {
    return apiError(new Error("originStationId and destinationStationId are required"), 400);
  }
  if (!body.awbNumber) {
    return apiError(new Error("awbNumber is required"), 400);
  }

  const depTime = body.departureTime ? new Date(body.departureTime) : new Date();
  const arrTime = body.arrivalTime ? new Date(body.arrivalTime) : new Date(depTime.getTime() + 6 * 60 * 60 * 1000);

  const [masterAWB] = await Promise.all([
    prisma.masterAWB.create({
      data: {
        createdById: session.user.id,
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
        departureTime: depTime,
        arrivalTime: arrTime,
      },
      include: { houseAWBs: true, originStation: true, destinationStation: true },
    }),
    body.flightNumber && body.airlineId
      ? prisma.flight.upsert({
          where: {
            flightNumber_airlineId_departureTime: {
              flightNumber: body.flightNumber,
              airlineId: body.airlineId,
              departureTime: depTime,
            },
          },
          update: { status: "SCHEDULED", originStationId: body.originStationId, destinationStationId: body.destinationStationId, arrivalTime: arrTime },
          create: {
            
            airlineId: body.airlineId,
            flightNumber: body.flightNumber,
            originStationId: body.originStationId,
            destinationStationId: body.destinationStationId,
            departureTime: depTime,
            arrivalTime: arrTime,
            status: "SCHEDULED",
          },
        })
      : Promise.resolve(null),
  ]);

  return apiSuccess(masterAWB, 201);
});
