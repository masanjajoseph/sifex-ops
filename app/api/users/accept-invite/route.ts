import { NextRequest, NextResponse } from "next/server";
import { acceptInvitation } from "@/services/invitation";
import { apiError } from "@/features/auth/permissions.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const result = await acceptInvitation(token, password);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && (err.message === "Invalid invitation token" || err.message === "Invitation already used" || err.message === "Invitation has expired")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return apiError(err instanceof Error ? err : new Error("Failed to accept invitation"));
  }
}
