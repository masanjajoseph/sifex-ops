import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { customsService } from "@/features/cargo/customs/customs.service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const declaration = await prisma.customsDeclaration.findUnique({
    where: { id, deletedAt: null },
    include: { customsItems: true },
  });

  if (!declaration) {
    return apiError(new NotFoundError("Customs declaration"));
  }

  return apiSuccess(declaration);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:customs:update")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.customsDeclaration.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Customs declaration"));
  }

  const body = await req.json();

  if (body.status) {
    const result = await customsService.updateStatus(id, body.status, session.user.id, body.metadata);
    if (!result.success) {
      return apiError(new Error(result.errors?.join(", ")));
    }
  }

  if (body.action === "hold" && body.reason) {
    await customsService.issueHold(id, body.reason, session.user.id);
  }

  if (body.action === "release") {
    await customsService.releaseFromCustoms(id, body.releasedBy || session.user.id, session.user.id);
  }

  const updated = await prisma.customsDeclaration.findUnique({
    where: { id },
    include: { customsItems: true },
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:customs:delete")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.customsDeclaration.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Customs declaration"));
  }

  await prisma.customsDeclaration.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
