import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("roles.view");
  if (error) return error;

  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { userRoles: true } },
      rolePermissions: {
        include: { permission: { select: { id: true, code: true, name: true, module: true } } },
      },
    },
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.userRoles,
    permissions: role.rolePermissions.map((rp) => rp.permission),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("roles.update");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, permissionIds } = body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.isSystem && name !== undefined && name !== role.name) {
      return NextResponse.json({ error: "Cannot rename system roles" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.role.update({ where: { id }, data: updateData });
      }

      if (permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId: string) => ({ roleId: id, permissionId })),
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: { permission: { select: { id: true, code: true, name: true, module: true } } },
          },
        },
      });
    });

    await createAuditLog({
      userId: session.user.id,
      action: "ROLE_UPDATED",
      entity: "Role",
      entityId: id,
      metadata: { updatedFields: Object.keys(updateData), permissionsUpdated: permissionIds !== undefined },
    });

    return NextResponse.json({
      id: updated!.id,
      name: updated!.name,
      code: updated!.code,
      description: updated!.description,
      permissions: updated!.rolePermissions.map((rp) => rp.permission),
    });
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to update role"));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("roles.delete");
  if (error) return error;

  const { id } = await params;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (role.isSystem) {
    return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 });
  }

  const userCount = await prisma.userRole.count({ where: { roleId: id } });
  if (userCount > 0) {
    return NextResponse.json({ error: `Cannot delete role assigned to ${userCount} users` }, { status: 400 });
  }

  await prisma.role.delete({ where: { id } });

  await createAuditLog({
    userId: session.user.id,
    action: "ROLE_DELETED",
    entity: "Role",
    entityId: id,
    metadata: { name: role.name, code: role.code },
  });

  return NextResponse.json({ success: true });
}
