import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all HAWBs without a MAWB (unassigned)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;

  const where: any = { masterAWBId: null, deletedAt: null };
  if (search) {
    where.OR = [
      { houseAWBNumber: { contains: search, mode: "insensitive" } },
      { trackingNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const hawbs = await prisma.houseAWB.findMany({
    where,
    include: {
      shipper: { select: { name: true } },
      receiver: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(hawbs);
});

// POST: Assign selected HAWBs to a MAWB
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { hawbIds, masterAWBId } = body;

  if (!hawbIds || !Array.isArray(hawbIds) || hawbIds.length === 0) {
    return apiError(new Error("hawbIds array required"), 400);
  }
  if (!masterAWBId) {
    return apiError(new Error("masterAWBId required"), 400);
  }

  const masterAwb = await prisma.masterAWB.findFirst({
    where: { id: masterAWBId, deletedAt: null },
  });
  if (!masterAwb) return apiError(new Error("MAWB not found"), 404);

  const existingHawbs = await prisma.houseAWB.findMany({
    where: { id: { in: hawbIds }, deletedAt: null },
  });

  if (existingHawbs.length !== hawbIds.length) {
    return apiError(new Error("Some HAWBs not found"), 404);
  }

  const alreadyAssigned = existingHawbs.filter(h => h.masterAWBId && h.masterAWBId !== masterAWBId);
  if (alreadyAssigned.length > 0) {
    return apiError(new Error(`HAWBs ${alreadyAssigned.map(h => h.houseAWBNumber).join(", ")} already assigned to another MAWB`), 400);
  }

  await prisma.houseAWB.updateMany({
    where: { id: { in: hawbIds } },
    data: { masterAWBId },
  });

  const agg = await prisma.houseAWB.aggregate({
    where: { masterAWBId, deletedAt: null },
    _sum: { pieces: true, weight: true, volume: true, chargeableWeight: true },
  });

  await prisma.masterAWB.update({
    where: { id: masterAWBId },
    data: {
      awbPieces: agg._sum.pieces || 0,
      awbWeight: agg._sum.weight || 0,
      volume: agg._sum.volume || 0,
      chargeableWeight: agg._sum.chargeableWeight || 0,
    },
  });

  return apiSuccess({
    assigned: hawbIds.length,
    masterAWBId,
    totals: {
      pieces: agg._sum.pieces || 0,
      weight: agg._sum.weight || 0,
    },
  });
});
