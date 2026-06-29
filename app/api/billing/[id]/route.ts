import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/features/cargo/billing/billing.service";
import { syncWorkflowStage } from "@/features/cargo/workflows/workflow-stage.workflow";
import { createAuditLog } from "@/services/audit";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const record = await prisma.billingRecord.findUnique({
    where: { id, deletedAt: null },
    include: { billingCharges: true, payments: true, customer: true },
  });

  if (!record) {
    return apiError(new NotFoundError("Billing record"));
  }

  const houseAWB = record.houseAWBId
    ? await prisma.houseAWB.findUnique({
        where: { id: record.houseAWBId },
        include: {
          shipper: { select: { name: true, phone: true, address: true, city: true, email: true } },
          masterAWB: { select: { awbNumber: true, shipmentType: true, originStation: { select: { name: true, code: true } } } },
        },
      })
    : null;

  const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: 'desc' } });
  const exchangeRate = latestRate && typeof latestRate.rates === 'object' && latestRate.rates !== null
    ? (latestRate.rates as Record<string, number>)['TZS'] ?? 2500
    : 2500;

  return apiSuccess({ ...record, houseAWB, exchangeRate });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "billing.update")) {
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

  if (body.charges) {
    if (body.replaceCharges) {
      await prisma.billingCharge.deleteMany({ where: { billingRecordId: id } });
    }
    for (const charge of body.charges) {
      let amount = charge.amount;
      let description = charge.description || charge.type;
      if (charge.type === "AIRLINE_FREIGHT" && charge.rate != null && charge.chargeableWeight != null) {
        amount = Number(charge.rate) * Number(charge.chargeableWeight);
        description = `Air freight (${charge.rate}/kg × ${charge.chargeableWeight} kg)`;
      }
      await prisma.billingCharge.create({
        data: {
          billingRecordId: id,
          type: charge.type,
          amount,
          currency: charge.currency || "USD",
          description,
        },
      });
    }

    const updatedCharges = await prisma.billingCharge.findMany({ where: { billingRecordId: id } });
    const totalAmount = updatedCharges.reduce((sum, c) => sum + c.amount, 0);
    await prisma.billingRecord.update({
      where: { id },
      data: { totalAmount, remainingAmount: Math.max(0, totalAmount - existing.paidAmount) },
    });
  }

  const updated = await prisma.billingRecord.findUnique({
    where: { id },
    include: { billingCharges: true, payments: true, customer: true },
  });

  const houseAWB = updated?.houseAWBId
    ? await prisma.houseAWB.findUnique({
        where: { id: updated.houseAWBId },
        include: {
          shipper: { select: { name: true, phone: true, address: true, city: true, email: true } },
          masterAWB: { select: { awbNumber: true, shipmentType: true, originStation: { select: { name: true, code: true } } } },
        },
      })
    : null;

  const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: 'desc' } });
  const exchangeRate = latestRate && typeof latestRate.rates === 'object' && latestRate.rates !== null
    ? (latestRate.rates as Record<string, number>)['TZS'] ?? 2500
    : 2500;

  return apiSuccess({ ...updated, houseAWB, exchangeRate });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  if (!hasPermission(session, "billing.payment")) {
    return apiError(new Error("Forbidden"), 403);
  }

  const { id } = await params;
  const existing = await prisma.billingRecord.findUnique({ where: { id, deletedAt: null } });

  if (!existing) {
    return apiError(new NotFoundError("Billing record"));
  }

  const body = await req.json();
  const { status, paymentMethod, reference } = body;
  const validStatuses = ["paid", "credited"];
  if (!validStatuses.includes(status)) {
    return apiError(new Error("Invalid status. Must be 'paid' or 'credited'"), 400);
  }
  if (!paymentMethod) {
    return apiError(new Error("Payment method is required"), 400);
  }

  const validMethods = ["cash", "bank", "mobile"];
  if (!validMethods.includes(paymentMethod)) {
    return apiError(new Error("Invalid payment method. Must be 'cash', 'bank', or 'mobile'"), 400);
  }

  const paidAmount = existing.totalAmount;
  await prisma.payment.create({
    data: {
      processedById: session.user.id,
      billingRecordId: id,
      amount: paidAmount,
      currency: existing.currency,
      paymentMethod: paymentMethod.toUpperCase(),
      reference: reference || `PAY-${Date.now()}`,
      exchangeRate: 1.0,
    },
  });

  const newStatus = status.toUpperCase();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    paidAmount,
    remainingAmount: 0,
    fullyPaidAt: new Date(),
    firstPaymentAt: existing.firstPaymentAt || new Date(),
    lastPaymentAt: new Date(),
  };

  await prisma.billingRecord.update({
    where: { id },
    data: updateData as any,
  });

  // Cascade payment status to linked HAWB and auto-transition to WAITING_DELIVERY
  if (existing.houseAWBId && newStatus === "PAID") {
    await prisma.$transaction(async (tx) => {
      await tx.houseAWB.update({
        where: { id: existing.houseAWBId! },
        data: {
          billingStatus: newStatus as any,
          paymentMethod: paymentMethod.toUpperCase() as any,
          cargoStatus: "AWAITING_DELIVERY",
        },
      });

      await syncWorkflowStage("HouseAWB", existing.houseAWBId!, "AWAITING_DELIVERY" as any, session.user.id!);
    });
  } else if (existing.houseAWBId) {
    await prisma.houseAWB.update({
      where: { id: existing.houseAWBId },
      data: {
        billingStatus: newStatus as any,
        paymentMethod: paymentMethod.toUpperCase() as any,
      },
    });
  }

  await prisma.trackingEvent.create({
    data: {
      entityType: "BillingRecord",
      entityId: id,
      eventType: "PAYMENT",
      status: status.toUpperCase(),
      title: `Payment of ${paidAmount} ${existing.currency} recorded`,
      userId: session.user.id!,
      createdAt: new Date(),
    },
  });

  if (existing.houseAWBId && newStatus === "PAID") {
    await prisma.trackingEvent.create({
      data: {
        entityType: "HouseAWB",
        entityId: existing.houseAWBId,
        eventType: "AWAITING_DELIVERY",
        status: "AWAITING_DELIVERY",
        title: "Payment complete — awaiting delivery assignment",
        userId: session.user.id!,
        createdAt: new Date(),
      },
    });
  }

  await createAuditLog({
    userId: session.user.id!,
    action: "UPDATE",
    entity: "BillingRecord",
    entityId: id,
    metadata: {
      field: "status",
      oldValue: existing.status,
      newValue: newStatus,
      paymentMethod,
      houseAWBId: existing.houseAWBId,
    },
  });

  const updated = await prisma.billingRecord.findUnique({
    where: { id },
    include: { billingCharges: true, payments: true, customer: true },
  });

  const houseAWB = updated?.houseAWBId
    ? await prisma.houseAWB.findUnique({
        where: { id: updated.houseAWBId },
        include: {
          shipper: { select: { name: true, phone: true, address: true, city: true, email: true } },
          masterAWB: { select: { awbNumber: true, shipmentType: true, originStation: { select: { name: true, code: true } } } },
        },
      })
    : null;

  return apiSuccess({ ...updated, houseAWB }, 200);
});
