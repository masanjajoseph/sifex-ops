import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMnoPayload, sendMnoPaymentRequest } from "@/lib/evpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { billingId, mobileNo, network, product } = body;

    if (!billingId || !mobileNo || !network) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const record = await prisma.billingRecord.findUnique({ where: { id: billingId, deletedAt: null } });
    if (!record) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (record.status === "PAID") {
      return NextResponse.json({ success: false, error: "Invoice already paid" }, { status: 400 });
    }

    const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: "desc" } });
    const exchangeRate =
      latestRate && typeof latestRate.rates === "object" && latestRate.rates !== null
        ? (latestRate.rates as Record<string, number>).TZS || 2500
        : 2500;

    const totalTzs = Math.round(record.totalAmount * exchangeRate);

    const phoneClean = mobileNo.replace(/^\+/, "");
    const mnoProduct = product || `SIFEX-${billingId.slice(0, 8)}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/evpay/mno-callback`;

    const payload = buildMnoPayload({
      apiTo: network,
      amount: totalTzs,
      product: mnoProduct,
      mobileNo: phoneClean,
      reference: billingId,
      callbackUrl,
    });

    const response = await sendMnoPaymentRequest(payload);

    if (response.response_code === 200) {
      return NextResponse.json({ success: true, data: response });
    } else {
      return NextResponse.json({ success: false, error: response.response_desc || "Payment request failed" }, { status: 400 });
    }
  } catch (error) {
    console.error("[EvPay MNO Charge Error]", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
