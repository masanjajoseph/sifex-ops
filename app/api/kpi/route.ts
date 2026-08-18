import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { getLiveKPIs } from "@/lib/kpi-engine";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const kpis = await getLiveKPIs();

  return apiSuccess(kpis);
});
