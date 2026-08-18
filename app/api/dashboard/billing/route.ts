import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const waitingPayment = await prisma.billingRecord.count({
    where: { status: "WAITING_PAYMENT", deletedAt: null },
  });

  const paidToday = await prisma.billingRecord.count({
    where: {
      status: "PAID",
      updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      deletedAt: null,
    },
  });

  const paidRecords = await prisma.billingRecord.findMany({
    where: { deletedAt: null },
    select: { totalAmount: true, paidAmount: true, remainingAmount: true },
  });

  const totalOutstanding = paidRecords.reduce((sum, r) => sum + r.remainingAmount, 0);
  const totalCollected = paidRecords.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalInvoiced = paidRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [avgPaymentTime, invoiceCountMonth, collectionRate] = await Promise.all([
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (p.payment_date - br.invoiced_at)) / 86400)::float as avg_days
      FROM payments p
      JOIN billing_records br ON br.id = p.billing_record_id
      WHERE br.invoiced_at IS NOT NULL AND p.payment_date IS NOT NULL
    `.then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      return row?.avg_days ? Math.round(row.avg_days * 100) / 100 : 0;
    }),
    prisma.billingRecord.count({
      where: { deletedAt: null, createdAt: { gte: monthStart } },
    }),
    totalInvoiced > 0
      ? Math.round((totalCollected / totalInvoiced) * 10000) / 100
      : 0,
  ]);

  return apiSuccess({
    waitingPayment,
    paidToday,
    totalOutstanding,
    totalCollected,
    totalInvoiced,
    totalRecords: paidRecords.length,
    avgPaymentTime,
    invoiceCountMonth,
    collectionRate,
  });
});
