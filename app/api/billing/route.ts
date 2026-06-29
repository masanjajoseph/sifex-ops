import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { billingService, BillingRecordData } from "@/features/cargo/billing/billing.service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || undefined;
  const houseAWBId = searchParams.get("houseAWBId") || undefined;

  const where: Record<string, unknown> = {
    
    deletedAt: null,
  };
  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (houseAWBId) where.houseAWBId = houseAWBId;

  const [items, total] = await Promise.all([
    prisma.billingRecord.findMany({
      where: where as any,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        billingCharges: true,
        payments: true,
        customer: { select: { name: true, phone: true } },
        houseAWB: { select: { houseAWBNumber: true, masterAWB: { select: { awbNumber: true } } } },
      },
    }),
    prisma.billingRecord.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session || !session.user) {
    return apiError(new Error("Unauthorized"), 401);
  }
  const userId = session.user.id;

  const hasPerm = hasPermission(session, "BILLING:CREATE");
  if (!hasPerm) {
    return apiError(new Error("Forbidden"), 403);
  }

  const body = await req.json();

  const result = await billingService.generateInvoice({
    houseAWBId: body.houseAWBId,
    
    charges: body.charges || [],
    userId,
  });

  if ("errors" in result) {
    const err = result as { errors: string[] };
    return apiError(new Error(err.errors.join(", ")), 422);
  }

  const data = result as BillingRecordData;

  const record = await prisma.billingRecord.create({
    data: {
      id: data.id,
      createdById: session.user.id,
      houseAWBId: data.houseAWBId,
      status: data.status as any,
      totalAmount: data.totalAmount,
      currency: data.currency,
      paidAmount: 0,
      remainingAmount: data.totalAmount,
      billingCharges: {
        create: data.charges.map((c) => ({
          type: c.type,
          amount: c.amount,
          currency: c.currency,
          description: c.description,
        })),
      },
    },
    include: { billingCharges: true, payments: true },
  });

  return apiSuccess(record, 201);
});
