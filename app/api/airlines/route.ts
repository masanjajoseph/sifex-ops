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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const status = searchParams.get("status") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    deletedAt: null,
  };
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.airline.findMany({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.airline.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:airline:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();
  const airline = await prisma.airline.create({
    data: {
      organizationId: session.user.organizationId,
      name: body.name,
      iataCode: body.iataCode,
      icaoCode: body.icaoCode,
      standardRate: body.standardRate || 0,
      premiumRate: body.premiumRate || 0,
      status: body.status || "ACTIVE",
    },
  });

  return apiSuccess(airline, 201);
});
