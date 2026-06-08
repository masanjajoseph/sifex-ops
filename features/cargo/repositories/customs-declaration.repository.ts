import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";
import { AppError } from "@/lib/errors";

export interface CustomsDeclarationRecord {
  id: string;
  organizationId: string;
  houseAWBId: string | null;
  masterAWBId: string | null;
  declarationNumber: string;
  declarationType: string;
  status: string;
  totalDeclaredValue: number;
  totalDeclaredWeight: number;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  submittedAt: Date;
  submittedBy: string;
  clearedAt: Date | null;
  clearedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class CustomsDeclarationRepository {
  async save(data: Omit<CustomsDeclarationRecord, "createdAt" | "updatedAt" | "deletedAt">): Promise<CustomsDeclarationRecord> {
    const record = await prisma.customsDeclaration.upsert({
      where: { id: data.id },
      create: data as any,
      update: data as any,
    });

    return record as unknown as CustomsDeclarationRecord;
  }

  async findById(id: string): Promise<CustomsDeclarationRecord | null> {
    const record = await prisma.customsDeclaration.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as CustomsDeclarationRecord | null;
  }

  async findByDeclarationNumber(declarationNumber: string): Promise<CustomsDeclarationRecord | null> {
    const record = await prisma.customsDeclaration.findUnique({
      where: { declarationNumber, deletedAt: null },
    });

    return record as unknown as CustomsDeclarationRecord | null;
  }

  async findMany(
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      organizationId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (options.status) where.status = options.status;
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.dateFrom || options.dateTo) {
      where.submittedAt = {};
      if (options.dateFrom) (where.submittedAt as Record<string, unknown>).gte = options.dateFrom;
      if (options.dateTo) (where.submittedAt as Record<string, unknown>).lte = options.dateTo;
    }

    return paginate<CustomsDeclarationRecord>(
      async (skip, take) => {
        const records = await prisma.customsDeclaration.findMany({
          where: where as any,
          skip,
          take,
          orderBy: { submittedAt: "desc" },
        });
        return records as unknown as CustomsDeclarationRecord[];
      },
      () => prisma.customsDeclaration.count({ where: where as any }),
      options.page,
      options.pageSize
    );
  }

  async softDelete(id: string): Promise<void> {
    const existing = await prisma.customsDeclaration.findUnique({ where: { id } });
    if (!existing) throw new AppError("Customs declaration not found", 404, "NOT_FOUND");

    await prisma.customsDeclaration.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const customsDeclarationRepository = new CustomsDeclarationRepository();
