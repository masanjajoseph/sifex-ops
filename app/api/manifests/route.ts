import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { manifestRepository } from "@/features/cargo/repositories/manifest.repository";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;
  const flightId = searchParams.get("flightId") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    deletedAt: null,
  };
  if (status) where.status = status;
  if (flightId) where.flightId = flightId;

  const [items, total] = await Promise.all([
    prisma.manifest.findMany({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.manifest.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:manifest:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();
  const manifestNumber = body.manifestNumber || `MFT-${Date.now().toString(36).toUpperCase()}`;

  const manifest = await manifestRepository.save({
    id: crypto.randomUUID(),
    organizationId: session.user.organizationId,
    flightId: body.flightId,
    manifestNumber,
    manifestType: body.manifestType || "EXPORT",
    status: "CREATED",
    totalWeight: body.totalWeight || 0,
    totalVolume: body.totalVolume || 0,
    totalPieces: body.totalPieces || 0,
    masterAWBIds: body.masterAWBIds || [],
  });

  if (body.masterAWBIds?.length) {
    await prisma.masterAWB.updateMany({
      where: { id: { in: body.masterAWBIds } },
      data: {
        manifestId: manifest.id,
        manifestNumber: manifest.manifestNumber,
        cargoStatus: "MANIFESTED",
        manifestedAt: new Date(),
      },
    });
  }

  return apiSuccess(manifest, 201);
});
