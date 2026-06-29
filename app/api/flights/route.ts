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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;
  const airlineId = searchParams.get("airlineId") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) where.status = status;
  if (airlineId) where.airlineId = airlineId;
  if (dateFrom || dateTo) {
    where.departureTime = {};
    if (dateFrom) (where.departureTime as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.departureTime as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.flight.findMany({
      where: where as any,
      include: { originStation: true, destinationStation: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { departureTime: "asc" },
    }),
    prisma.flight.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:flight:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();
  const flight = await prisma.flight.create({
    data: {
      
      airlineId: body.airlineId,
      flightNumber: body.flightNumber,
      aircraftType: body.aircraftType,
      originStationId: body.originStationId,
      destinationStationId: body.destinationStationId,
      departureTime: new Date(body.departureTime),
      arrivalTime: new Date(body.arrivalTime),
      totalCapacity: body.totalCapacity || 0,
      availableCapacity: body.availableCapacity || body.totalCapacity || 0,
      status: body.status || "SCHEDULED",
    },
  });

  return apiSuccess(flight, 201);
});
