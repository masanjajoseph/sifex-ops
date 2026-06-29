import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    return apiError(new NotFoundError("Organization settings"), 404);
  }

  return apiSuccess(settings);
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();

  const allowedFields = [
    "defaultCurrency", "exchangeRate", "taxPercentage",
    "defaultChargeableDivisor", "autoGenerateTracking",
    "trackingPrefix", "companyName", "companyCode",
    "operationalStations",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const existing = await prisma.systemSettings.findFirst();
  const settings = existing
    ? await prisma.systemSettings.update({ where: { id: existing.id }, data: data as any })
    : await prisma.systemSettings.create({
      data: {
        companyName: body.companyName || "",
        companyCode: body.companyCode || "",
        defaultCurrency: body.defaultCurrency || "USD",
        exchangeRate: body.exchangeRate || 1.0,
        taxPercentage: body.taxPercentage || 0,
        trackingPrefix: body.trackingPrefix || "SFX",
        operationalStations: body.operationalStations || [],
        ...data,
      } as any,
    });

  return apiSuccess(settings);
});
