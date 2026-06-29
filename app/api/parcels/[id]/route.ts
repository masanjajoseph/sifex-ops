import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: { warehouseLocation: true, houseAWB: true },
  });

  if (!parcel) {
    return apiError(new NotFoundError("Parcel"), 404);
  }

  return apiSuccess(parcel);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.parcel.findUnique({ where: { id } });

  if (!existing) {
    return apiError(new NotFoundError("Parcel"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "description", "quantity", "actualWeight", "volumetricWeight",
    "length", "width", "height", "volume", "value", "hsCode",
    "packageType", "condition", "barcode", "qrCode", "serialNumber",
    "warehouseLocationId",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.parcel.update({
    where: { id },
    data: data as any,
    include: { warehouseLocation: true },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.parcel.findUnique({ where: { id } });

  if (!existing) {
    return apiError(new NotFoundError("Parcel"), 404);
  }

  await prisma.parcel.delete({ where: { id } });

  return apiSuccess({ deleted: true });
});
