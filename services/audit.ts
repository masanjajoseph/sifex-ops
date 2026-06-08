import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE"
  | "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "PASSWORD_RESET" | "PERMISSION_CHANGE"
  | "APPROVE" | "REJECT" | "EXPORT";

interface AuditParams {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: (params.metadata ?? {}) as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Audit failures must never crash the main flow
    logger.error("Failed to write audit log", error, "AuditService");
  }
}

/** Extract IP and user-agent from a Next.js Request */
export function extractRequestMeta(req: Request) {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

/** Purge audit logs older than retentionDays (default 90) */
export async function purgeOldAuditLogs(retentionDays = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  logger.info(`Purged ${count} audit logs older than ${retentionDays} days`, undefined, "AuditService");
  return count;
}
