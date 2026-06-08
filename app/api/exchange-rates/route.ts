import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const latest = await prisma.exchangeRateSnapshot.findFirst({
    orderBy: { validAt: "desc" },
  });

  return apiSuccess(latest);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();
  const { baseCurrency, rates, source } = body;

  if (!rates || typeof rates !== "object") {
    return apiError(new Error("rates object is required"), 400);
  }

  const snapshot = await prisma.exchangeRateSnapshot.create({
    data: {
      baseCurrency: baseCurrency || "USD",
      rates,
      source: source || "manual",
      validAt: new Date(),
    },
  });

  return apiSuccess(snapshot, 201);
});
