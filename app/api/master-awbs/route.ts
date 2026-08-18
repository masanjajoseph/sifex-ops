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

  const searchOr = search ? [
    { awbNumber: { contains: search, mode: "insensitive" } },
    { trackingNumber: { contains: search, mode: "insensitive" } },
    { senderName: { contains: search, mode: "insensitive" } },
    { receiverName: { contains: search, mode: "insensitive" } },
  ] : undefined;

  let where: any = { deletedAt: null };
  if (status) where.workflowStatus = status;
  if (scope === "export") {
    where.AND = [
      { workflowStage: WorkflowStage.EXPORT },
      ...(searchOr ? [{ OR: searchOr }] : []),
    ];
    if (status) where.AND.push({ workflowStatus: status });
  } else if (scope === "import") {
    where.AND = [
      {
        OR: [
          { workflowStage: WorkflowStage.IMPORT },
          { workflowStatus: "DISPATCHED" },
          { workflowStatus: "IN_TRANSIT" },
          { workflowStatus: "PRE_ARRIVAL" },
          { workflowStatus: "TERMINAL_ARRIVED" },
          { workflowStatus: "MANIFEST_VERIFIED" },
          { workflowStatus: "MAWB_RECEIVED" },
          { workflowStatus: "RECEIVED" },
          { workflowStatus: "DOCUMENTS_VERIFIED" },
          { workflowStatus: "PIECES_VERIFIED" },
          { workflowStatus: "WEIGHT_VERIFIED" },
          { workflowStatus: "DAMAGE_INSPECTED" },
          { workflowStatus: "CUSTOMS_SUBMITTED" },
          { workflowStatus: "CUSTOMS_ASSESSED" },
          { workflowStatus: "CUSTOMS_PAID" },
          { workflowStatus: "CUSTOMS_INSPECTION" },
          { workflowStatus: "CUSTOMS_CLEARED" },
          { workflowStatus: "WAREHOUSE_RECEIVING" },
          { workflowStatus: "EXCEPTION" },
        ],
      },
      ...(searchOr ? [{ OR: searchOr }] : []),
    ];
    if (status) where.AND.push({ workflowStatus: status });
  } else if (scope === "warehouse") {
    where.AND = [
      { workflowStage: WorkflowStage.WAREHOUSE },
      ...(searchOr ? [{ OR: searchOr }] : []),
    ];
    if (status) where.AND.push({ workflowStatus: status });
  } else if (scope === "delivery") {
    where.AND = [
      { workflowStage: WorkflowStage.DELIVERY },
      ...(searchOr ? [{ OR: searchOr }] : []),
    ];
    if (status) where.AND.push({ workflowStatus: status });
  } else {
    if (searchOr) where.OR = searchOr;
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
