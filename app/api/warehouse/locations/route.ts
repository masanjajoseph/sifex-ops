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
  const zoneId = searchParams.get("zoneId");

  if (!zoneId) {
    return apiError(new Error("Query parameter 'zoneId' is required"), 400);
  }

  const locations = await prisma.storageLocation.findMany({
    where: { zoneId, deletedAt: null },
    orderBy: { code: "asc" },
  });

  return apiSuccess(locations);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "warehouse:location:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.zoneId || !body.code) {
    return apiError(new Error("zoneId and code are required"), 400);
  }

  const location = await prisma.storageLocation.create({
    data: {
      zoneId: body.zoneId,
      code: body.code,
      barcode: body.barcode || `${body.code}-${Date.now()}`,
      maxWeight: body.maxWeight || 0,
    },
  });

  return apiSuccess(location, 201);
});
