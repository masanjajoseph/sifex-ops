import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCheckoutUrl } from "@/lib/evpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { billingId, firstName, lastName, email, phone, address1, locality, administrativeArea, postalCode } = body;

    if (!billingId || !firstName || !email || !phone) {
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

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/evpay/callback`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/invoice/${billingId}`;

    const checkoutUrl = buildCheckoutUrl({
      total: totalTzs.toFixed(2),
      currency: "TZS",
      reference: billingId,
      country: "TZ",
      firstName,
      lastName: lastName || firstName,
      email,
      phoneNumber: phone.replace(/^\+/, ""),
      address1: address1 || "Dar es Salaam",
      locality: locality || "Dar es Salaam",
      administrativeArea: administrativeArea || "Dar es Salaam",
      postalCode: postalCode || "10000",
      returnUrl,
    });

    return NextResponse.json({ success: true, url: checkoutUrl });
  } catch (error) {
    console.error("[EvPay Charge Error]", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
