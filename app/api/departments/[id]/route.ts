import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.update");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, isActive } = body;

    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.department.update({ where: { id }, data: updateData });

    await createAuditLog({
      userId: session.user.id,
      action: "DEPARTMENT_UPDATED",
      entity: "Department",
      entityId: id,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to update department"));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePermission("users.delete");
  if (error) return error;

  const { id } = await params;

  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept || dept.deletedAt) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const userCount = await prisma.user.count({ where: { departmentId: id, deletedAt: null } });
  if (userCount > 0) {
    return NextResponse.json({ error: `Cannot delete department with ${userCount} active users` }, { status: 400 });
  }

  await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "DEPARTMENT_DELETED",
    entity: "Department",
    entityId: id,
    metadata: { name: dept.name },
  });

  return NextResponse.json({ success: true });
}
