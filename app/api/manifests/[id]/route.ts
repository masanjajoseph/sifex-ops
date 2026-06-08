import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { manifestRepository } from "@/features/cargo/repositories/manifest.repository";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const manifest = await manifestRepository.findById(id);
  if (!manifest) {
    return apiError(new NotFoundError("Manifest"));
  }

  const masterAWBs = await prisma.masterAWB.findMany({
    where: { id: { in: manifest.masterAWBIds }, deletedAt: null },
  });

  return apiSuccess({ ...manifest, masterAWBs });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:manifest:update")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await manifestRepository.findById(id);
  if (!existing) {
    return apiError(new NotFoundError("Manifest"));
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = { ...existing };

  if (body.status) updateData.status = body.status;
  if (body.submittedAt || body.status === "SUBMITTED_TO_AIRLINE") {
    updateData.submittedAt = new Date();
    updateData.submittedBy = session.user.id;
  }
  if (body.status === "CONFIRMED_BY_AIRLINE") {
    updateData.airlineConfirmedAt = new Date();
    updateData.airlineConfirmedBy = session.user.id;
  }
  if (body.masterAWBIds) updateData.masterAWBIds = body.masterAWBIds;

  const updated = await prisma.manifest.update({
    where: { id },
    data: {
      status: updateData.status as string,
      submittedAt: updateData.submittedAt as Date | undefined,
      submittedBy: updateData.submittedBy as string | undefined,
      airlineConfirmedAt: updateData.airlineConfirmedAt as Date | undefined,
      airlineConfirmedBy: updateData.airlineConfirmedBy as string | undefined,
      masterAWBIds: updateData.masterAWBIds as string[],
    },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:manifest:delete")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await manifestRepository.findById(id);
  if (!existing) {
    return apiError(new NotFoundError("Manifest"));
  }

  await manifestRepository.softDelete(id);
  return apiSuccess({ deleted: true });
});
