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
  const quote = await prisma.quotationRequest.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
    include: { customer: true },
  });

  if (!quote) {
    return apiError(new NotFoundError("Quote"), 404);
  }

  return apiSuccess(quote);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.quotationRequest.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Quote"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "status", "shipmentType", "description",
    "pieces", "weight", "volume", "chargeableWeight",
    "originStationId", "destinationStationId",
    "freightCost", "transportCost", "warehouseCost",
    "customsCost", "consolidationCost",
    "totalAmount", "currency",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      if (key === "validUntil") {
        data[key] = new Date(body[key]);
      } else {
        data[key] = body[key];
      }
    }
  }

  const updated = await prisma.quotationRequest.update({
    where: { id },
    data: data as any,
    include: { customer: true },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.quotationRequest.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Quote"), 404);
  }

  await prisma.quotationRequest.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
