import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { paginate } from "@/lib/db-helpers";

export interface DeliveryAssignmentRecord {
  id: string;
  organizationId: string;
  houseAWBId: string | null;
  masterAWBId: string | null;
  riderId: string;
  status: string;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  notes: string | null;
  assignedAt: Date;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class DeliveryAssignmentRepository {
  async create(data: {
    organizationId: string;
    houseAWBId?: string;
    masterAWBId?: string;
    riderId: string;
    status?: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    recipientName?: string;
    recipientPhone?: string;
    notes?: string;
  }): Promise<DeliveryAssignmentRecord> {
    const record = await prisma.deliveryAssignment.create({
      data: {
        organizationId: data.organizationId,
        houseAWBId: data.houseAWBId,
        masterAWBId: data.masterAWBId,
        riderId: data.riderId,
        status: data.status ?? "ASSIGNED",
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        notes: data.notes,
      },
    });

    return record as unknown as DeliveryAssignmentRecord;
  }

  async findById(id: string): Promise<DeliveryAssignmentRecord | null> {
    const record = await prisma.deliveryAssignment.findUnique({
      where: { id, deletedAt: null },
    });

    return record as unknown as DeliveryAssignmentRecord | null;
  }

  async findByRider(
    riderId: string,
    options: { status?: string; page?: number; pageSize?: number } = {}
  ) {
    const where: Prisma.DeliveryAssignmentWhereInput = {
      riderId,
      deletedAt: null,
    };

    if (options.status) where.status = options.status;

    return paginate<DeliveryAssignmentRecord>(
      async (skip, take) => {
        const records = await prisma.deliveryAssignment.findMany({
          where,
          skip,
          take,
          orderBy: { assignedAt: "desc" },
        });
        return records as unknown as DeliveryAssignmentRecord[];
      },
      () => prisma.deliveryAssignment.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async findByOrganization(
    organizationId: string,
    statuses: string[],
    options: { page?: number; pageSize?: number } = {}
  ) {
    const where: Prisma.DeliveryAssignmentWhereInput = {
      organizationId,
      deletedAt: null,
      status: { in: statuses },
    };

    return paginate<DeliveryAssignmentRecord>(
      async (skip, take) => {
        const records = await prisma.deliveryAssignment.findMany({
          where,
          skip,
          take,
          orderBy: { assignedAt: "desc" },
        });
        return records as unknown as DeliveryAssignmentRecord[];
      },
      () => prisma.deliveryAssignment.count({ where }),
      options.page,
      options.pageSize
    );
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: {
      pickedUpAt?: Date;
      deliveredAt?: Date;
      failedAt?: Date;
      failureReason?: string;
    }
  ): Promise<DeliveryAssignmentRecord> {
    const existing = await prisma.deliveryAssignment.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Delivery assignment not found");
    }

    const record = await prisma.deliveryAssignment.update({
      where: { id },
      data: {
        status,
        pickedUpAt: extra?.pickedUpAt,
        deliveredAt: extra?.deliveredAt,
        failedAt: extra?.failedAt,
        failureReason: extra?.failureReason,
      },
    });

    return record as unknown as DeliveryAssignmentRecord;
  }
}

export const deliveryAssignmentRepository = new DeliveryAssignmentRepository();
