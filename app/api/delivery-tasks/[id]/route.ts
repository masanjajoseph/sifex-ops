import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError, AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const task = await prisma.deliveryTask.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignedRider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } } },
      assignedBy: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      houseAWB: {
        select: {
          houseAWBNumber: true, trackingNumber: true, pieces: true, weight: true,
          description: true, cargoStatus: true, workflowStatus: true,
          shipper: { select: { name: true, phone: true } },
          receiver: { select: { name: true, phone: true, address: true } },
        },
      },
      masterAWB: { select: { awbNumber: true, trackingNumber: true, flightNumber: true } },
    },
  });

  if (!task) return apiError(new NotFoundError("Delivery task"), 404);

  return apiSuccess(task);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const existing = await prisma.deliveryTask.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) return apiError(new NotFoundError("Delivery task"), 404);

  const body = await req.json();

  const allowedFields = [
    "assignedRiderId", "assignedById", "assignmentNote",
    "status", "priority",
    "customerName", "customerPhone", "pickupAddress", "deliveryAddress",
    "recipientName", "recipientPhone", "signature", "notes",
    "cancelReason",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (updateData.status === "ASSIGNED" || (body.assignedRiderId && existing.status === "WAITING_ASSIGNMENT")) {
    updateData.assignedAt = existing.assignedAt || new Date();
    if (body.assignedRiderId) {
      updateData.assignedRiderId = body.assignedRiderId;
      updateData.assignedById = session.user.id;
      updateData.status = "ASSIGNED";
    }
  }
  if (updateData.status === "STARTED") updateData.startedAt = existing.startedAt || new Date();
  if (updateData.status === "ARRIVED") updateData.arrivedAt = existing.arrivedAt || new Date();
  if (updateData.status === "DELIVERED") updateData.deliveredAt = existing.deliveredAt || new Date();
  if (updateData.status === "COMPLETED") updateData.completedAt = existing.completedAt || new Date();
  if (updateData.status === "CANCELLED") {
    updateData.cancelledAt = existing.cancelledAt || new Date();
    if (body.cancelReason) updateData.cancelReason = body.cancelReason;
  }

  const task = await prisma.deliveryTask.update({
    where: { id },
    data: updateData,
    include: {
      assignedRider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      houseAWB: { select: { houseAWBNumber: true, trackingNumber: true } },
    },
  });

  return apiSuccess(task);
});
