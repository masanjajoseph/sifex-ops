import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transaction_reference, payment_id, status, amount, currency, success, approval_code, card_type, card_masked } = body;

    console.log("[EvPay Callback] Received:", JSON.stringify(body));

    if (!transaction_reference) {
      return NextResponse.json({ status: "error", message: "Missing reference" }, { status: 400 });
    }

    const record = await prisma.billingRecord.findFirst({
      where: { id: transaction_reference, deletedAt: null },
      include: { payments: true },
    });

    if (!record) {
      console.warn(`[EvPay] BillingRecord not found: ${transaction_reference}`);
      return NextResponse.json({ status: "ok" });
    }

    if (success && status === "AUTHORIZED") {
      const tzsAmount = parseFloat(amount);

      const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: "desc" } });
      const exchangeRate =
        latestRate && typeof latestRate.rates === "object" && latestRate.rates !== null
          ? (latestRate.rates as Record<string, number>).TZS || 2500
          : 2500;

      const usdAmount = tzsAmount / exchangeRate;

      await prisma.payment.create({
        data: {
          billingRecordId: record.id,
          amount: tzsAmount,
          currency: "TZS",
          paymentMethod: "CARD",
          reference: payment_id || `CARD-${Date.now()}`,
          exchangeRate,
          processedById: null,
          paymentDate: new Date(),
        },
      });

      await prisma.billingRecord.update({
        where: { id: record.id },
        data: {
          status: "PAID",
          paidAmount: usdAmount,
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
            paymentMethod: "CARD",
          },
        });
      }

      await prisma.trackingEvent.create({
        data: {
          entityType: "BillingRecord",
          entityId: record.id,
          eventType: "PAYMENT",
          status: "PAID",
          title: `Card payment of TZS ${tzsAmount.toLocaleString()} received (${card_type || "card"})`,
          userId: "00000000-0000-0000-0000-000000000000",
          createdAt: new Date(),
        },
      });

      console.log(`[EvPay] Payment recorded: ${transaction_reference}`);
    } else {
      console.log(`[EvPay] Payment not successful: ${status}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[EvPay Callback Error]", error);
    return NextResponse.json({ status: "ok" });
  }
}
