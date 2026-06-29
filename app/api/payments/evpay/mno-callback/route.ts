import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ResultType, TransactionStatus, TransID, Amount, ThirdPartyReference } = body;

    console.log("[EvPay MNO Callback] Received:", JSON.stringify(body));

    if (!ThirdPartyReference) {
      return NextResponse.json({ status: "error", message: "Missing reference" }, { status: 400 });
    }

    const record = await prisma.billingRecord.findFirst({
      where: { id: ThirdPartyReference, deletedAt: null },
    });

    if (!record) {
      console.warn(`[EvPay MNO] BillingRecord not found: ${ThirdPartyReference}`);
      return NextResponse.json({ status: "ok" });
    }

    if (ResultType === true && TransactionStatus?.toLowerCase() === "success") {
      const tzsAmount = parseFloat(Amount || "0");

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
          paymentMethod: "MOBILE",
          reference: TransID || `MNO-${Date.now()}`,
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
            paymentMethod: "MOBILE",
          },
        });
      }

      await prisma.trackingEvent.create({
        data: {
          entityType: "BillingRecord",
          entityId: record.id,
          eventType: "PAYMENT",
          status: "PAID",
          title: `Mobile payment of TZS ${tzsAmount.toLocaleString()} received`,
          userId: "00000000-0000-0000-0000-000000000000",
          createdAt: new Date(),
        },
      });

      console.log(`[EvPay MNO] Payment recorded: ${ThirdPartyReference}`);
    }

    return NextResponse.json({ Status: "Success" });
  } catch (error) {
    console.error("[EvPay MNO Callback Error]", error);
    return NextResponse.json({ Status: "Success" });
  }
}
