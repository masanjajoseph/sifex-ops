import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface BillingChargeRecord {
  id: string;
  billingRecordId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  appliedAt: Date;
  createdAt: Date;
}

export class BillingChargeRepository {
  async save(data: Omit<BillingChargeRecord, "createdAt">): Promise<BillingChargeRecord> {
    const record = await prisma.billingCharge.create({
      data,
    });

    return record as unknown as BillingChargeRecord;
  }

  async findById(id: string): Promise<BillingChargeRecord | null> {
    const record = await prisma.billingCharge.findUnique({
      where: { id },
    });

    return record as unknown as BillingChargeRecord | null;
  }

  async findByBillingRecordId(billingRecordId: string): Promise<BillingChargeRecord[]> {
    const records = await prisma.billingCharge.findMany({
      where: { billingRecordId },
      orderBy: { appliedAt: "asc" },
    });

    return records as unknown as BillingChargeRecord[];
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      billingRecordId?: string;
      type?: string;
    } = {}
  ) {
    const where: Prisma.BillingChargeWhereInput = {};

    if (options.billingRecordId) where.billingRecordId = options.billingRecordId;
    if (options.type) where.type = options.type;

    return paginate<BillingChargeRecord>(
      async (skip, take) => {
        const records = await prisma.billingCharge.findMany({
          where,
          skip,
          take,
          orderBy: { appliedAt: "desc" },
        });
        return records as unknown as BillingChargeRecord[];
      },
      () => prisma.billingCharge.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.billingCharge.findUnique({ where: { id } });
    if (!existing) throw new AppError("Billing charge not found", 404, "NOT_FOUND");

    await prisma.billingCharge.update({
      where: { id },
      data: { billingRecordId: existing.billingRecordId }, // no-op; billing charge does not have deletedAt
    });
  }
}

export const billingChargeRepository = new BillingChargeRepository();
