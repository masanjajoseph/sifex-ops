import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { customsService } from "@/features/cargo/customs/customs.service";

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
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    deletedAt: null,
  };
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.submittedAt = {};
    if (dateFrom) (where.submittedAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.submittedAt as Record<string, unknown>).lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.customsDeclaration.findMany({
      where: where as any,
      include: { customsItems: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customsDeclaration.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:customs:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();
  const result = await customsService.submitDeclaration({
    organizationId: session.user.organizationId,
    houseAWBId: body.houseAWBId,
    masterAWBId: body.masterAWBId,
    declarationType: body.declarationType,
    hsCode: body.hsCode,
    originCountry: body.originCountry,
    destinationCountry: body.destinationCountry,
    items: body.items || [],
    userId: session.user.id,
  });

  if ("errors" in result) {
    return apiError(new Error(result.errors.join(", ")), 422);
  }

  return apiSuccess(result, 201);
});
