import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission("users.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");

  const where: Record<string, unknown> = { deletedAt: null };
  if (departmentId) where.departmentId = departmentId;

  const positions = await prisma.position.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ positions });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requirePermission("users.create");
  if (error) return error;

  try {
    const body = await request.json();
    const { name, code, description, departmentId } = body;

    if (!name || !code || !departmentId) {
      return NextResponse.json({ error: "Name, code, and departmentId are required" }, { status: 400 });
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.deletedAt) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const existing = await prisma.position.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Position with this code already exists" }, { status: 409 });
    }

    const position = await prisma.position.create({
      data: { name, code: code.toUpperCase(), description, departmentId },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "POSITION_CREATED",
      entity: "Position",
      entityId: position.id,
      metadata: { name: position.name, code: position.code, departmentId },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to create position"));
  }
}
