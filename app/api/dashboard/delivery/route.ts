import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const waitingAssignment = await prisma.deliveryTask.count({
    where: { status: "WAITING_ASSIGNMENT", deletedAt: null },
  });

  const assigned = await prisma.deliveryTask.count({
    where: { status: "ASSIGNED", deletedAt: null },
  });

  const started = await prisma.deliveryTask.count({
    where: { status: "STARTED", deletedAt: null },
  });

  const deliveredToday = await prisma.deliveryTask.count({
    where: {
      status: { in: ["DELIVERED", "COMPLETED"] },
      deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      deletedAt: null,
    },
  });

  const totalActive = await prisma.deliveryTask.count({
    where: {
      status: { in: ["ASSIGNED", "STARTED", "ARRIVED"] },
      deletedAt: null,
    },
  });

  const cancelled = await prisma.deliveryTask.count({
    where: { status: "CANCELLED", deletedAt: null },
  });

  return apiSuccess({
    waitingAssignment,
    assigned,
    started,
    deliveredToday,
    totalActive,
    cancelled,
  });
});
