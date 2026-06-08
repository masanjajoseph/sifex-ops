import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const masterAWB = await prisma.masterAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
    include: {
      houseAWBs: { where: { deletedAt: null }, include: { parcels: true } },
      originStation: true,
      destinationStation: true,
      currentStation: true,
    },
  });

  if (!masterAWB) {
    return apiError(new NotFoundError("Master AWB"), 404);
  }

  return apiSuccess(masterAWB);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.masterAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
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
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.masterAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
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
