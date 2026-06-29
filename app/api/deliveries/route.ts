import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;
  const riderId = searchParams.get("riderId") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) where.status = status;
  if (riderId) where.riderId = riderId;

  const [items, total] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      where: where as any,
      include: { rider: { include: { user: true } }, houseAWB: { select: { houseAWBNumber: true, trackingNumber: true, pieces: true, cargoStatus: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.deliveryAssignment.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "delivery:assignment:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.riderId) {
    return apiError(new Error("riderId is required"), 400);
  }

  const delivery = await prisma.deliveryAssignment.create({
    data: {
      
      houseAWBId: body.houseAWBId,
      masterAWBId: body.masterAWBId,
      riderId: body.riderId,
      status: "ASSIGNED",
      pickupAddress: body.pickupAddress,
      deliveryAddress: body.deliveryAddress,
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      notes: body.notes,
      assignedAt: new Date(),
    },
    include: { rider: { include: { user: true } } },
  });

  return apiSuccess(delivery, 201);
});
