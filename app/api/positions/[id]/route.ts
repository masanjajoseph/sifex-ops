import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.update");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, departmentId, isActive } = body;

    const pos = await prisma.position.findUnique({ where: { id } });
    if (!pos || pos.deletedAt) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept || dept.deletedAt) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.position.update({ where: { id }, data: updateData });

    await createAuditLog({
      userId: session.user.id,
      action: "POSITION_UPDATED",
      entity: "Position",
      entityId: id,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to update position"));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.delete");
  if (error) return error;

  const { id } = await params;

  const pos = await prisma.position.findUnique({ where: { id } });
  if (!pos || pos.deletedAt) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  const userCount = await prisma.user.count({ where: { positionId: id, deletedAt: null } });
  if (userCount > 0) {
    return NextResponse.json({ error: `Cannot delete position with ${userCount} active users` }, { status: 400 });
  }

  await prisma.position.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "POSITION_DELETED",
    entity: "Position",
    entityId: id,
    metadata: { name: pos.name },
  });

  return NextResponse.json({ success: true });
}
