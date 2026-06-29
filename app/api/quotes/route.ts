import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const CreateQuoteSchema = z.object({
  customerId: z.string().uuid(),
  shipmentType: z.string().optional(),
  description: z.string().optional(),
  pieces: z.number().int().nonnegative().default(0),
  weight: z.number().nonnegative().default(0),
  volume: z.number().nonnegative().default(0),
  chargeableWeight: z.number().nonnegative().default(0),
  originStationId: z.string().uuid().optional(),
  destinationStationId: z.string().uuid().optional(),
  freightCost: z.number().nonnegative().default(0),
  transportCost: z.number().nonnegative().default(0),
  warehouseCost: z.number().nonnegative().default(0),
  customsCost: z.number().nonnegative().default(0),
  consolidationCost: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative().default(0),
  currency: z.string().default("USD"),
  validUntil: z.string().datetime().optional(),
});

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const status = searchParams.get("status") || undefined;
  const customerId = searchParams.get("customerId") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [items, total] = await Promise.all([
    prisma.quotationRequest.findMany({
      where: where as any,
      include: { customer: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.quotationRequest.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const body = await req.json();
  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(new Error(parsed.error.issues.map((e: { message: string }) => e.message).join(", ")), 400);
  }

  const data = parsed.data;
  const rand = crypto.randomInt(10000, 99999);
  const quoteNumber = `Q-${rand}`;

  const quote = await prisma.quotationRequest.create({
    data: {
      
      customerId: data.customerId,
      quoteNumber,
      status: "DRAFT",
      shipmentType: data.shipmentType as any || undefined,
      description: data.description,
      pieces: data.pieces,
      weight: data.weight,
      volume: data.volume,
      chargeableWeight: data.chargeableWeight,
      originStationId: data.originStationId,
      destinationStationId: data.destinationStationId,
      freightCost: data.freightCost,
      transportCost: data.transportCost,
      warehouseCost: data.warehouseCost,
      customsCost: data.customsCost,
      consolidationCost: data.consolidationCost,
      totalAmount: data.totalAmount,
      currency: data.currency,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
    },
    include: { customer: true },
  });

  return apiSuccess(quote, 201);
});
