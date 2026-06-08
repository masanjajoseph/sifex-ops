import { prisma } from "@/lib/prisma";

export interface OrganizationRecord {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  logo: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class OrganizationRepository {
  async create(data: {
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    logo?: string;
    website?: string;
  }): Promise<OrganizationRecord> {
    const record = await prisma.organization.create({
      data: {
        name: data.name,
        code: data.code,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        logo: data.logo,
        website: data.website,
      },
    });

    return record as unknown as OrganizationRecord;
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const record = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as OrganizationRecord | null;
  }

  async findByCode(code: string): Promise<OrganizationRecord | null> {
    const record = await prisma.organization.findUnique({
      where: { code, deletedAt: null },
    });

    return record as unknown as OrganizationRecord | null;
  }

  async findTree(id: string) {
    const record = await prisma.organization.findUnique({
      where: { id, deletedAt: null },
      include: {
        branches: {
          where: { deletedAt: null },
          include: {
            stations: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return record;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      country: string;
      logo: string;
      website: string;
      isActive: boolean;
    }>
  ): Promise<OrganizationRecord> {
    const record = await prisma.organization.update({
      where: { id },
      data,
    });

    return record as unknown as OrganizationRecord;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const organizationRepository = new OrganizationRepository();
