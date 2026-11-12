import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TCRA_BASE_URL } from "@/lib/tcra/types";
import { selfTestSignature } from "@/lib/tcra/signing";

export const dynamic = "force-dynamic";

function mask(value?: string): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrationId = process.env.TCRA_INTEGRATION_ID ?? null;
  const tokenId = process.env.TCRA_TOKEN_ID ?? null;
  const signature = await selfTestSignature();

  return NextResponse.json({
    baseUrl: TCRA_BASE_URL,
    environment: process.env.TCRA_TEST_MODE === "true" ? "test" : "production",
    integrationId,
    tokenId: mask(tokenId ?? undefined),
    signatureConfigured: Boolean(process.env.TCRA_KEY_PATH || process.env.TCRA_PRIVATE_KEY),
    signatureValid: signature,
    endpoints: {
      events: "/v1/api/events",
      snapshot: "/v1/api/snapshot",
      revenue: "/v1/api/revenue",
      logs: "/v1/api/logs/submit",
    },
  });
}
