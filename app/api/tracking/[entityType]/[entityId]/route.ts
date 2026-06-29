import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { entityType, entityId } = await params;

  const validTypes = ["MasterAWB", "HouseAWB", "Parcel"];
  if (!validTypes.includes(entityType)) {
    return apiError(new Error("Invalid entity type. Must be MasterAWB, HouseAWB, or Parcel"), 400);
  }

  const events = await prisma.trackingEvent.findMany({
    where: { entityType, entityId,  },
    orderBy: { createdAt: "desc" },
  });

  if (events.length === 0) {
    return apiError(new NotFoundError("Tracking events"), 404);
  }

  return apiSuccess(events);
});
