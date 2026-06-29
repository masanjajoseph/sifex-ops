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
  const limit = parseInt(searchParams.get("limit") || "50");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {
    deletedAt: null,
  };
  if (isActive !== null) where.isActive = isActive === "true";

  const [items, total] = await Promise.all([
    prisma.rider.findMany({
      where: where as any,
      include: { user: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rider.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "delivery:rider:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.userId) {
    return apiError(new Error("userId is required"), 400);
  }

  const rider = await prisma.rider.create({
    data: {
      userId: body.userId,
      vehicleType: body.vehicleType || "BIKE",
      vehicleReg: body.vehicleReg,
      phone: body.phone,
      isActive: body.isActive !== false,
    },
    include: { user: true },
  });

  return apiSuccess(rider, 201);
});
