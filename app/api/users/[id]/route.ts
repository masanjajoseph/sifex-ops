import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { requireAuth, requirePermission, createAuditLog, apiError, apiForbidden } from "@/features/auth/permissions.service";

const SALT_ROUNDS = 12;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.view");
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      userRoles: {
        include: { role: { select: { id: true, code: true, name: true, description: true } } },
      },
    },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    status: user.status,
    departmentId: user.departmentId,
    department: user.department,
    positionId: user.positionId,
    position: user.position,
    branchId: user.branchId,
    branch: user.branch,
    roles: user.userRoles.map((ur) => ur.role),
    passwordResetRequired: user.passwordResetRequired,
    firstLoginAt: user.firstLoginAt,
    invitedAt: user.invitedAt,
    lastLoginAt: user.lastLoginAt,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const isOwnProfile = session.user.id === id;
  const hasPermission = session.user.permissions?.includes("users.update");

  if (!isOwnProfile && !hasPermission) {
    return apiForbidden();
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, departmentId, positionId, branchId, status, roleIds, password } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (!isOwnProfile && email !== undefined) updateData.email = email;
    if (isOwnProfile && email !== undefined && email !== existing.email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (!isOwnProfile && departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (!isOwnProfile && positionId !== undefined) updateData.positionId = positionId || null;
    if (!isOwnProfile && branchId !== undefined) updateData.branchId = branchId || null;
    if (!isOwnProfile && status !== undefined) updateData.status = status;
    if (password) updateData.password = await hash(password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        include: {
          userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
          department: { select: { id: true, name: true } },
        },
      });

      if (!isOwnProfile && roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        include: {
          userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
          department: { select: { id: true, name: true } },
        },
      });
    });

    await createAuditLog({
      userId: session.user.id,
      action: "USER_UPDATED",
      entity: "User",
      entityId: id,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json({
      id: user!.id,
      email: user!.email,
      firstName: user!.firstName,
      lastName: user!.lastName,
      status: user!.status,
      roles: user!.userRoles.map((ur) => ur.role),
      department: user!.department,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    if (message.includes("Unique constraint") && message.includes("email")) {
      return apiError(new Error("Email is already in use by another account"), 409);
    }
    return apiError(new Error(message), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.delete");
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "DISABLED" },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "USER_DELETED",
    entity: "User",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
