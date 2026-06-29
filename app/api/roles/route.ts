import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function GET() {
  const { error } = await requirePermission("roles.view");
  if (error) return error;

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { userRoles: true } },
      rolePermissions: {
        include: { permission: { select: { id: true, code: true, name: true, module: true } } },
      },
    },
  });

  const mapped = roles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.userRoles,
    permissions: r.rolePermissions.map((rp) => rp.permission),
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ roles: mapped });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requirePermission("roles.create");
  if (error) return error;

  try {
    const body = await request.json();
    const { name, code, description, permissionIds } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const existing = await prisma.role.findFirst({
      where: { OR: [{ name }, { code }] },
    });
    if (existing) {
      return NextResponse.json({ error: "A role with this name or code already exists" }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        code: code.toUpperCase().replace(/\s+/g, "_"),
        description,
        rolePermissions: permissionIds?.length
          ? { create: permissionIds.map((id: string) => ({ permissionId: id })) }
          : undefined,
      },
      include: {
        rolePermissions: {
          include: { permission: { select: { id: true, code: true, name: true, module: true } } },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "ROLE_CREATED",
      entity: "Role",
      entityId: role.id,
      metadata: { name: role.name, code: role.code },
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    }, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to create role"));
  }
}
