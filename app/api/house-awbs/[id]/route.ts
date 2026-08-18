import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const hawb = await prisma.houseAWB.findFirst({
    where: { id,  deletedAt: null },
    include: {
      parcels: true,
      shipper: true,
      receiver: true,
      masterAWB: { select: { id: true, awbNumber: true, cargoStatus: true, workflowStatus: true, workflowStage: true, originStation: { select: { code: true, name: true } }, destinationStation: { select: { code: true, name: true } } } },
    },
  });

  if (!hawb) {
    return apiError(new NotFoundError("House AWB"), 404);
  }

  return apiSuccess(hawb);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const existing = await prisma.houseAWB.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) return apiError(new NotFoundError("House AWB"), 404);

  const body = await req.json();

  const allowedFields = [
    "description", "pieces", "weight", "volume", "chargeableWeight", "volumeWeight",
    "length", "width", "height", "freight", "freightRate", "insurance",
    "hsCode", "originCountry", "destinationCountry",
    "shipmentType", "paymentMode", "currency", "customsValue",
    "shipperId", "receiverId",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) return apiError(new Error("No valid fields to update"), 400);

  const updated = await prisma.houseAWB.update({
    where: { id },
    data: data as any,
    include: { shipper: true, receiver: true, masterAWB: { select: { awbNumber: true } } },
  });

  await createAuditLog({
    userId: session.user.id!,
    action: "UPDATE",
    entity: "HouseAWB",
    entityId: id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return apiSuccess(updated);
});
