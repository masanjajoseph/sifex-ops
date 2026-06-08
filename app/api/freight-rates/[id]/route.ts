import { NextRequest } from "next/server";
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
  const rate = await prisma.freightRate.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!rate) {
    return apiError(new NotFoundError("Freight rate"), 404);
  }

  return apiSuccess(rate);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.freightRate.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Freight rate"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "shipmentType", "ratePerKg", "currency", "isActive",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      data[key] = body[key];
    }
  }

  const updated = await prisma.freightRate.update({
    where: { id },
    data: data as any,
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.freightRate.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Freight rate"), 404);
  }

  await prisma.freightRate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
