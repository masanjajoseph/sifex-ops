import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/features/auth/permissions.service";
import { completeFirstLogin } from "@/services/invitation";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const result = await completeFirstLogin(session.user.id, password);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return apiError(err instanceof Error ? err : new Error("Failed to complete first login"));
  }
}
