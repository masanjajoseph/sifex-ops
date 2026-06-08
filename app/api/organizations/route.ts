import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (!hasPermission(session, "admin:organization:view_all")) {
    where.id = session.user.organizationId;
  }

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.organization.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "admin:organization:create")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  if (!body.name || !body.code) {
    return apiError(new Error("name and code are required"), 400);
  }

  const organization = await prisma.organization.create({
    data: {
      name: body.name,
      code: body.code,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      country: body.country,
    },
  });

  return apiSuccess(organization, 201);
});
