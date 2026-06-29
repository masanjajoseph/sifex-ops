import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const hawb = await prisma.houseAWB.findFirst({
    where: { id,  deletedAt: null },
    include: {
      parcels: true,
      shipper: true,
      receiver: true,
      masterAWB: { include: { originStation: true, destinationStation: true } },
    },
  });

  if (!hawb) {
    return apiError(new NotFoundError("House AWB"), 404);
  }

  return apiSuccess(hawb);
});
