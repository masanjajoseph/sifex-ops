import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { FreightRateSchema } from "@/types/cargo-domain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");
  const shipmentType = searchParams.get("shipmentType") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    deletedAt: null,
  };
  if (isActive !== null) where.isActive = isActive === "true";
  if (shipmentType) where.shipmentType = shipmentType;

  const rates = await prisma.freightRate.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(rates);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();
  const parsed = FreightRateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(new Error(parsed.error.issues.map((e: { message: string }) => e.message).join(", ")), 400);
  }

  const data = parsed.data;

  const rate = await prisma.freightRate.create({
    data: {
      organizationId: session.user.organizationId,
      shipmentType: data.shipmentType,
      ratePerKg: data.ratePerKg,
      currency: data.currency,
      isActive: data.isActive,
    },
  });

  return apiSuccess(rate, 201);
});
