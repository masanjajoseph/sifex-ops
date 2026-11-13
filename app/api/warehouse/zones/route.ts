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
  let stationId: string | null = searchParams.get("stationId");

  if (!stationId) {
    const userStations = session.user.stations as string[] | undefined;
    stationId = (userStations && userStations.length > 0) ? userStations[0] : null;
  }

  if (!stationId && !session.user.stations?.length) {
    const firstZone = await prisma.warehouseZone.findFirst({ where: { deletedAt: null }, select: { stationId: true } });
    if (firstZone) stationId = firstZone.stationId;
  }
  if (!stationId) {
    return apiSuccess([]);
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
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "warehouse:zone:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  // Resolve the station server-side so the UI does not need to know it.
  let stationId: string | null = body.stationId || null;
  if (!stationId) {
    const userStations = session.user.stations as string[] | undefined;
    stationId = userStations && userStations.length > 0 ? userStations[0] : null;
  }
  if (!stationId) {
    const firstZone = await prisma.warehouseZone.findFirst({
      where: { deletedAt: null },
      select: { stationId: true },
    });
    stationId = firstZone?.stationId ?? null;
  }
  if (!stationId) {
    const firstStation = await prisma.station.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    stationId = firstStation?.id ?? null;
  }

  if (!stationId) {
    return apiError(new Error("Unable to resolve a station for this user"), 400);
  }

  if (!body.code || !body.name) {
    return apiError(new Error("code and name are required"), 400);
  }

  const zone = await prisma.warehouseZone.create({
    data: {
      stationId,
      code: body.code,
      name: body.name,
      type: body.type || "STORAGE",
      capacity: body.capacity || 0,
    },
  });

  return apiSuccess(zone, 201);
});
