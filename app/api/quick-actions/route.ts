import { NextResponse } from "next/server";
import { requireAuth } from "@/features/auth/permissions.service";
import { getQuickActions } from "@/features/auth/quick-actions.service";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const permissions = session.user.permissions ?? [];
  const actions = getQuickActions(permissions);

  return NextResponse.json({ actions });
}
