import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";

export async function GET() {
  const { error } = await requirePermission("users.view");
  if (error) return error;

  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, positions: true } },
    },
  });

  return NextResponse.json({ departments });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requirePermission("users.create");
  if (error) return error;

  try {
    const body = await request.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const existing = await prisma.department.findFirst({
      where: { OR: [{ name }, { code }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Department with this name or code already exists" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: { name, code: code.toUpperCase(), description },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DEPARTMENT_CREATED",
      entity: "Department",
      entityId: department.id,
      metadata: { name: department.name, code: department.code },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to create department"));
  }
}
