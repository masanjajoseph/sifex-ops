import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { CargoStatus } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { id } = await params;
  const hawb = await prisma.houseAWB.findFirst({ where: { id, deletedAt: null } });
  if (!hawb) return apiError(new Error("House AWB not found"), 404);
  if (hawb.cargoStatus !== CargoStatus.RELEASED) return apiError(new Error("Only RELEASED HAWBs can be marked ready for delivery"), 400);

  await prisma.houseAWB.update({
    where: { id },
    data: { cargoStatus: CargoStatus.AWAITING_DELIVERY },
  });

  await prisma.trackingEvent.create({
    data: {
      entityType: "HouseAWB",
      entityId: id,
      eventType: "AWAITING_DELIVERY",
      status: CargoStatus.AWAITING_DELIVERY,
      title: "Ready for delivery",
      userId: session.user.id!,
      createdAt: new Date(),
    },
  });

  return apiSuccess({ status: CargoStatus.AWAITING_DELIVERY });
});
