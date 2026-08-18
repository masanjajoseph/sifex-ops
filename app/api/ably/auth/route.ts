import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Realtime not configured", code: "ABLY_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const Ably = await import("ably");
    const rest = new Ably.Rest({ key: env.ABLY_API_KEY });
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: session.user.id,
    });
    return NextResponse.json(tokenRequest);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create token request", details: String(err) },
      { status: 500 },
    );
  }
}