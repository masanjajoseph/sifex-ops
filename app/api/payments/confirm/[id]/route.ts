import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "billing.payment")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const body = await req.json();
  const { paymentMethod, reference } = body;

  const validManualMethods = ["LIPA_NAMBA", "BANK", "CASH"];
  if (!validManualMethods.includes(paymentMethod)) {
    return apiError(new Error("Invalid manual payment method"), 400);
  }

  const record = await prisma.billingRecord.findUnique({ where: { id, deletedAt: null } });
  if (!record) {
    return apiError(new NotFoundError("Billing record"));
  }

  const paidAmount = record.totalAmount;

  await prisma.payment.create({
    data: {
      billingRecordId: id,
      amount: paidAmount,
      currency: record.currency,
      paymentMethod,
      reference: reference || `${paymentMethod}-${Date.now()}`,
      exchangeRate: 1.0,
      processedById: session.user.id,
      paymentDate: new Date(),
    },
  });

  await prisma.billingRecord.update({
    where: { id },
    data: {
      status: "PAID",
      paidAmount,
      remainingAmount: 0,
      fullyPaidAt: new Date(),
      firstPaymentAt: record.firstPaymentAt || new Date(),
      lastPaymentAt: new Date(),
    },
  });

  if (record.houseAWBId) {
    await prisma.houseAWB.update({
      where: { id: record.houseAWBId },
      data: {
        billingStatus: "PAID",
        paymentMethod: paymentMethod as any,
      },
    });
  }

  await prisma.trackingEvent.create({
    data: {
      entityType: "BillingRecord",
      entityId: id,
      eventType: "PAYMENT",
      status: "PAID",
      title: `Manual payment of ${paidAmount} ${record.currency} via ${paymentMethod} confirmed by ${session.user.name || session.user.email}`,
      userId: session.user.id!,
      createdAt: new Date(),
    },
  });

  const updated = await prisma.billingRecord.findUnique({
    where: { id },
    include: { billingCharges: true, payments: true, customer: true },
  });

  return NextResponse.json({ success: true, data: updated });
});
