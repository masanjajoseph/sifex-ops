import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const airline = await prisma.airline.findUnique({ where: { id, deletedAt: null } });

  if (!airline) {
    return apiError(new NotFoundError("Airline"));
  }

  return apiSuccess(airline);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:airline:update")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.airline.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Airline"));
  }

  const body = await req.json();
  const allowed = ["name", "iataCode", "icaoCode", "status", "standardRate", "premiumRate"];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.airline.update({
    where: { id },
    data: data as any,
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:airline:delete")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.airline.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Airline"));
  }

  await prisma.airline.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
