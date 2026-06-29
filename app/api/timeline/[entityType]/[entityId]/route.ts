import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { entityType, entityId } = await params;

  const validTypes = ["MasterAWB", "HouseAWB"];
  if (!validTypes.includes(entityType)) {
    return apiError(new Error("Invalid entity type. Must be MasterAWB or HouseAWB"), 400);
  }

  const timeline = await prisma.shipmentTimeline.findMany({
    where: { aggregateId: entityId, aggregateType: entityType },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(timeline);
});
