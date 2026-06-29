import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;
  const branchId = searchParams.get("branchId") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (type) where.type = type;
  if (branchId) where.branchId = branchId;

  const stations = await prisma.station.findMany({
    where: where as any,
    orderBy: { name: "asc" },
  });

  return apiSuccess(stations);
});
