import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/features/cargo/billing/billing.service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const record = await prisma.billingRecord.findUnique({
    where: { id, deletedAt: null },
    include: { billingCharges: true, payments: true },
  });

  if (!record) {
    return apiError(new NotFoundError("Billing record"));
  }

  return apiSuccess(record);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:billing:update")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.billingRecord.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Billing record"));
  }

  const body = await req.json();

  if (body.status) {
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "INVOICED") updateData.invoicedAt = new Date();
    if (body.status === "PAID") {
      updateData.fullyPaidAt = new Date();
      updateData.paidAmount = existing.totalAmount;
      updateData.remainingAmount = 0;
    }

    await prisma.billingRecord.update({
      where: { id },
      data: updateData as any,
    });
  }

  if (body.charges?.length) {
    for (const charge of body.charges) {
      await prisma.billingCharge.create({
        data: {
          billingRecordId: id,
          type: charge.type,
          amount: charge.amount,
          currency: charge.currency || "USD",
          description: charge.description,
        },
      });
    }

    const updatedCharges = await prisma.billingCharge.findMany({ where: { billingRecordId: id } });
    const totalAmount = updatedCharges.reduce((sum, c) => sum + c.amount, 0);
    const paidAmount = existing.paidAmount;
    await prisma.billingRecord.update({
      where: { id },
      data: { totalAmount, remainingAmount: totalAmount - paidAmount },
    });
  }

  const updated = await prisma.billingRecord.findUnique({
    where: { id },
    include: { billingCharges: true, payments: true },
  });

  return apiSuccess(updated);
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "cargo:billing:payment")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.billingRecord.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Billing record"));
  }

  const body = await req.json();
  const payment = await prisma.payment.create({
    data: {
      billingRecordId: id,
      amount: body.amount,
      currency: body.currency || "USD",
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      exchangeRate: body.exchangeRate || 1.0,
      notes: body.notes,
    },
  });

  const newPaid = existing.paidAmount + body.amount;
  const newRemaining = Math.max(0, existing.totalAmount - newPaid);
  const updateData: Record<string, unknown> = {
    paidAmount: newPaid,
    remainingAmount: newRemaining,
    firstPaymentAt: existing.firstPaymentAt || new Date(),
    lastPaymentAt: new Date(),
  };

  if (newRemaining <= 0) {
    updateData.status = "PAID";
    updateData.fullyPaidAt = new Date();
  } else {
    updateData.status = existing.status === "NOT_BILLED" ? "DRAFT" : "PARTIAL_PAID";
  }

  await prisma.billingRecord.update({
    where: { id },
    data: updateData as any,
  });

  return apiSuccess(payment, 201);
});
