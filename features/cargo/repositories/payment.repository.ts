import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface PaymentRecord {
  id: string;
  billingRecordId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: Date;
  reference: string;
  exchangeRate: number;
  notes: string | null;
  createdAt: Date;
}

export class PaymentRepository {
  async save(data: Omit<PaymentRecord, "createdAt">): Promise<PaymentRecord> {
    const record = await prisma.payment.create({
      data,
    });

    return record as unknown as PaymentRecord;
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const record = await prisma.payment.findUnique({
      where: { id },
    });

    return record as unknown as PaymentRecord | null;
  }

  async findByBillingRecordId(billingRecordId: string): Promise<PaymentRecord[]> {
    const records = await prisma.payment.findMany({
      where: { billingRecordId },
      orderBy: { paymentDate: "desc" },
    });

    return records as unknown as PaymentRecord[];
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      billingRecordId?: string;
    } = {}
  ) {
    const where: Prisma.PaymentWhereInput = {};

    if (options.billingRecordId) where.billingRecordId = options.billingRecordId;

    return paginate<PaymentRecord>(
      async (skip, take) => {
        const records = await prisma.payment.findMany({
          where,
          skip,
          take,
          orderBy: { paymentDate: "desc" },
        });
        return records as unknown as PaymentRecord[];
      },
      () => prisma.payment.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new AppError("Payment not found", 404, "NOT_FOUND");

    await prisma.payment.update({
      where: { id },
      data: { billingRecordId: existing.billingRecordId }, // no-op
    });
  }
}

export const paymentRepository = new PaymentRepository();
