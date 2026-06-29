import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface BillingRecordRecord {
  id: string;
  houseAWBId: string | null;
  masterAWBId: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  paidAmount: number;
  remainingAmount: number;
  invoicedAt: Date | null;
  firstPaymentAt: Date | null;
  lastPaymentAt: Date | null;
  fullyPaidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class BillingRecordRepository {
  async save(data: Omit<BillingRecordRecord, "createdAt" | "updatedAt" | "deletedAt">): Promise<BillingRecordRecord> {
    const record = await prisma.billingRecord.upsert({
      where: { id: data.id },
      create: data as any,
      update: data as any,
    });

    return record as unknown as BillingRecordRecord;
  }

  async findById(id: string): Promise<BillingRecordRecord | null> {
    const record = await prisma.billingRecord.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as BillingRecordRecord | null;
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      houseAWBId?: string;
      masterAWBId?: string;
    } = {}
  ) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (options.status) where.status = options.status;
    if (options.houseAWBId) where.houseAWBId = options.houseAWBId;
    if (options.masterAWBId) where.masterAWBId = options.masterAWBId;

    return paginate<BillingRecordRecord>(
      async (skip, take) => {
        const records = await prisma.billingRecord.findMany({
          where: where as any,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        });
        return records as unknown as BillingRecordRecord[];
      },
      () => prisma.billingRecord.count({ where: where as any }),
      options.page,
      options.pageSize
    );
  }

  async findCharges(billingRecordId: string) {
    const charges = await prisma.billingCharge.findMany({
      where: { billingRecordId },
      orderBy: { appliedAt: "asc" },
    });

    return charges;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.billingRecord.findUnique({ where: { id } });
    if (!existing) throw new AppError("Billing record not found", 404, "NOT_FOUND");

    await prisma.billingRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const billingRecordRepository = new BillingRecordRepository();
