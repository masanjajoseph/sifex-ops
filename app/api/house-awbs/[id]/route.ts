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
  const houseAWB = await prisma.houseAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
    include: {
      parcels: true,
      shipper: true,
      receiver: true,
      masterAWB: true,
    },
  });

  if (!houseAWB) {
    return apiError(new NotFoundError("House AWB"), 404);
  }

  return apiSuccess(houseAWB);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.houseAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("House AWB"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "cargoStatus", "warehouseStatus", "billingStatus",
    "masterAWBId", "pieces", "weight", "volume",
    "chargeableWeight", "volumeWeight",
    "freight", "freightRate", "insurance",
    "description",
    "hsCode", "originCountry", "destinationCountry",
    "receivedAt", "expectedArrivalDate",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      if (key === "receivedAt" || key === "expectedArrivalDate") {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key];
      }
    }
  }

  const updated = await prisma.houseAWB.update({
    where: { id },
    data: data as any,
    include: { parcels: true, shipper: true, receiver: true },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.houseAWB.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("House AWB"), 404);
  }

  await prisma.houseAWB.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
