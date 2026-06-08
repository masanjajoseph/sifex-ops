// Database model types (will be generated from Prisma)

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableModel extends BaseModel {
  createdById?: string;
  updatedById?: string;
  deletedAt?: Date | null;
}
