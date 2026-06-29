import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, createAuditLog, apiError } from "@/features/auth/permissions.service";
import { createUserWithInvitation } from "@/services/invitation";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { session, error } = await requirePermission("users.view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const roleId = searchParams.get("roleId") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const invitationStatus = searchParams.get("invitationStatus") || "";

  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = { deletedAt: null };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status as any;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (roleId) {
    where.userRoles = { some: { roleId } };
  }

  if (invitationStatus === "pending") {
    where.status = "INVITED";
  } else if (invitationStatus === "accepted") {
    where.firstLoginAt = { not: null };
  } else if (invitationStatus === "first_login_pending") {
    where.passwordResetRequired = true;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        userRoles: {
          include: { role: { select: { id: true, code: true, name: true } } },
        },
        invitations: {
          where: { status: "PENDING" },
          select: { id: true, status: true, expiresAt: true, createdAt: true },
          take: 1,
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const mapped = users.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    avatar: u.avatar,
    status: u.status,
    departmentId: u.departmentId,
    department: u.department,
    positionId: u.positionId,
    position: u.position,
    branchId: u.branchId,
    branch: u.branch,
    roles: u.userRoles.map((ur) => ur.role),
    passwordResetRequired: u.passwordResetRequired,
    firstLoginAt: u.firstLoginAt,
    invitedAt: u.invitedAt,
    lastLoginAt: u.lastLoginAt,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users: mapped, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requirePermission("users.create");
  if (error) return error;

  try {
    const body = await request.json();
    const { email, firstName, lastName, phone, roleIds } = body;
    const departmentId = body.departmentId || null;
    const positionId = body.positionId || null;
    const branchId = body.branchId || null;

    if (!email || !firstName || !lastName || !roleIds?.length) {
      return NextResponse.json({ error: "Email, firstName, lastName, and roleIds are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const user = await createUserWithInvitation({
      email,
      firstName,
      lastName,
      phone,
      departmentId,
      positionId,
      branchId,
      roleIds,
      invitedById: session.user.id,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    }, { status: 201 });
  } catch (err) {
    return apiError(err instanceof Error ? err : new Error("Failed to create user"));
  }
}
