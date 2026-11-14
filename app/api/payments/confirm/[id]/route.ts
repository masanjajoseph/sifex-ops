import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { syncWorkflowStage } from "@/features/cargo/workflows/workflow-stage.workflow";
import { workflowEngine } from "@/lib/workflow-engine";
import { WorkflowModule } from "@/lib/workflow-engine/types";

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
        cargoStatus: "AWAITING_DELIVERY",
      },
    });

    await syncWorkflowStage("HouseAWB", record.houseAWBId, "AWAITING_DELIVERY" as any, session.user.id!);
  }

  // Payment confirmation is the trigger for the billing → delivery workflow:
  // WAITING_PAYMENT → PAID (creates the delivery task in the engine).
  if (record.masterAWBId) {
    const mawb = await prisma.masterAWB.findFirst({
      where: { id: record.masterAWBId, deletedAt: null },
      select: { workflowStatus: true },
    });

    if (mawb?.workflowStatus === "WAITING_PAYMENT") {
      const workflowContext = {
        entityType: "MasterAWB" as const,
        entityId: record.masterAWBId,
        fromStatus: "WAITING_PAYMENT",
        toStatus: "PAID",
        module: WorkflowModule.BILLING,
        userId: session.user.id!,
        departmentId: session.user.departmentId || undefined,
        userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
        metadata: { action: "RECEIVE_PAYMENT", billingRecordId: id, paymentMethod },
      };

      Object.defineProperty(workflowContext, "action", {
        value: "RECEIVE_PAYMENT",
        enumerable: true,
      });

      await workflowEngine.execute(workflowContext);
    }
  }

  // Simplified flow: the MAWB normally stays in WAREHOUSE while each HAWB is
  // charged individually. Payment therefore has to hand that single HAWB to
  // delivery on its own, otherwise the delivery team never sees it.
  if (record.houseAWBId) {
    const existingTask = await prisma.deliveryTask.findFirst({
      where: { houseAWBId: record.houseAWBId, deletedAt: null },
      select: { id: true },
    });

    if (!existingTask) {
      const hawb = await prisma.houseAWB.findUnique({
        where: { id: record.houseAWBId },
        include: { receiver: true },
      });
      const taskCount = await prisma.deliveryTask.count();

      await prisma.deliveryTask.create({
        data: {
          taskNumber: `TASK-${String(taskCount + 1).padStart(6, "0")}`,
          houseAWBId: record.houseAWBId,
          masterAWBId: record.masterAWBId,
          customerName: hawb?.receiver?.name || null,
          deliveryAddress: hawb?.receiver?.address || null,
          status: "WAITING_ASSIGNMENT",
          createdById: session.user.id,
        },
      });

      await prisma.houseAWB.update({
        where: { id: record.houseAWBId },
        data: {
          billingStatus: "PAID",
          cargoStatus: "AWAITING_DELIVERY",
          workflowStatus: "PAID",
          // Still in the warehouse until a rider starts the delivery.
          workflowStage: "WAREHOUSE",
        },
      });
    }
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
