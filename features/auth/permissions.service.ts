import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function apiUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function apiForbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function apiError(error: Error, status = 500) {
  return NextResponse.json({ error: error.message }, { status });
}

type AuthResult =
  | { session: NonNullable<Awaited<ReturnType<typeof auth>>>; error: null }
  | { session: null; error: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) return { session: null, error: apiUnauthorized() as NextResponse };
  return { session: session as NonNullable<Awaited<ReturnType<typeof auth>>>, error: null };
}

export async function requirePermission(permission: string): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;
  if (!result.session.user.permissions?.includes(permission)) {
    return { session: null, error: apiForbidden() as NextResponse };
  }
  return result;
}

export async function requireRole(role: string): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;
  if (!result.session.user.roles?.includes(role)) {
    return { session: null, error: apiForbidden() as NextResponse };
  }
  return result;
}

export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.roles?.includes("SUPER_ADMIN") ?? false;
}

export async function createAuditLog(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({ data: params as unknown as Prisma.AuditLogCreateInput }).catch(() => {});
}
