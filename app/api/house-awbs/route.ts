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
  const notStatus = searchParams.get("notStatus") || undefined; // comma-separated
  const masterAWBId = searchParams.get("masterAWBId") || undefined;
  const search = searchParams.get("search") || undefined;

  const scope = searchParams.get("scope") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) where.cargoStatus = status;
  else if (notStatus) {
    const excluded = notStatus.split(',').map(s => s.trim());
    where.cargoStatus = { notIn: excluded };
  }
  if (scope === "export") {
    where.workflowStage = WorkflowStage.EXPORT;
  } else if (scope === "import") {
    where.workflowStage = WorkflowStage.IMPORT;
  } else if (scope === "warehouse") {
    where.workflowStage = WorkflowStage.WAREHOUSE;
  } else if (scope === "delivery") {
    where.workflowStage = WorkflowStage.DELIVERY;
  }
  if (masterAWBId) where.masterAWBId = masterAWBId;
  if (search) {
    where.OR = [
      { houseAWBNumber: { contains: search, mode: "insensitive" } },
      { trackingNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.houseAWB.findMany({
      where: where as any,
      include: { masterAWB: { select: { awbNumber: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.houseAWB.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();

  const houseAWB = await prisma.houseAWB.create({
    data: {
      createdById: session.user.id,
      masterAWBId: body.masterAWBId || null,
      houseAWBNumber: body.houseAWBNumber,
      trackingNumber: body.trackingNumber || body.houseAWBNumber,
      shipmentType: body.shipmentType || ShipmentType.CAN_GUANGZHOU,
      paymentMode: body.paymentMode || PaymentMode.PP,
      currency: body.currency || "USD",
      customsValue: body.customsValue || 0,
      shipperId: body.shipperId,
      receiverId: body.receiverId,
      pieces: body.pieces || 0,
      weight: body.weight || 0,
      volume: body.volume || 0,
      chargeableWeight: body.chargeableWeight || 0,
      volumeWeight: body.volumeWeight || 0,
      freight: body.freight || 0,
      freightRate: body.freightRate || 0,
      insurance: body.insurance || 0,
      hsCode: body.hsCode || "",
      originCountry: body.originCountry || "",
      destinationCountry: body.destinationCountry || "",
      description: body.description,
      cargoStatus: CargoStatus.INITIATED,
    },
    include: { parcels: true, shipper: true, receiver: true },
  });

  if (houseAWB.masterAWBId) {
    const agg = await prisma.houseAWB.aggregate({
      where: { masterAWBId: houseAWB.masterAWBId, deletedAt: null },
      _sum: { pieces: true, weight: true },
    });
    await prisma.masterAWB.update({
      where: { id: houseAWB.masterAWBId },
      data: {
        awbPieces: agg._sum.pieces || 0,
        awbWeight: agg._sum.weight || 0,
      },
    });
  }

  return apiSuccess(houseAWB, 201);
});
