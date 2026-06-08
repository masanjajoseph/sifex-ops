import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return apiError(new Error("Query parameter 'stationId' is required"), 400);
  }

  const zones = await prisma.warehouseZone.findMany({
    where: { stationId, deletedAt: null },
    include: { locations: true },
    orderBy: { name: "asc" },
  });

  return apiSuccess(zones);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "warehouse:zone:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.stationId || !body.code || !body.name) {
    return apiError(new Error("stationId, code, and name are required"), 400);
  }

  const zone = await prisma.warehouseZone.create({
    data: {
      stationId: body.stationId,
      code: body.code,
      name: body.name,
      type: body.type || "STORAGE",
      capacity: body.capacity || 0,
    },
  });

  return apiSuccess(zone, 201);
});
