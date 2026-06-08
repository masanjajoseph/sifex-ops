import { prisma } from "@/lib/prisma";

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class BranchRepository {
  async create(data: {
    name: string;
    code: string;
    organizationId: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
  }): Promise<BranchRecord> {
    const record = await prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        organizationId: data.organizationId,
        address: data.address,
        city: data.city,
        country: data.country,
        phone: data.phone,
        email: data.email,
      },
    });

    return record as unknown as BranchRecord;
  }

  async findById(id: string): Promise<BranchRecord | null> {
    const record = await prisma.branch.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as BranchRecord | null;
  }

  async findByOrganization(organizationId: string): Promise<BranchRecord[]> {
    const records = await prisma.branch.findMany({
      where: { organizationId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });

    return records as unknown as BranchRecord[];
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      address: string;
      city: string;
      country: string;
      phone: string;
      email: string;
      isActive: boolean;
    }>
  ): Promise<BranchRecord> {
    const record = await prisma.branch.update({
      where: { id },
      data,
    });

    return record as unknown as BranchRecord;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const branchRepository = new BranchRepository();
