import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const delivery = await prisma.deliveryAssignment.findUnique({
    where: { id, deletedAt: null },
    include: { rider: { include: { user: true } } },
  });

  if (!delivery) {
    return apiError(new NotFoundError("Delivery assignment"));
  }

  return apiSuccess(delivery);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "delivery:assignment:update")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.deliveryAssignment.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Delivery assignment"));
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.status) {
    updateData.status = body.status;

    switch (body.status) {
      case "PICKED_UP":
        updateData.pickedUpAt = new Date();
        break;
      case "DELIVERED":
        updateData.deliveredAt = new Date();
        break;
      case "FAILED":
        updateData.failedAt = new Date();
        updateData.failureReason = body.failureReason || "Unknown";
        break;
    }
  }

  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.deliveryAddress) updateData.deliveryAddress = body.deliveryAddress;
  if (body.recipientName) updateData.recipientName = body.recipientName;
  if (body.recipientPhone) updateData.recipientPhone = body.recipientPhone;

  const updated = await prisma.deliveryAssignment.update({
    where: { id },
    data: updateData as any,
    include: { rider: { include: { user: true } } },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "delivery:assignment:delete")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.deliveryAssignment.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Delivery assignment"));
  }

  await prisma.deliveryAssignment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
