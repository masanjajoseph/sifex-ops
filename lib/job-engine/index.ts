import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { publishJobUpdate } from "@/lib/realtime/publisher";

interface CreateJobParams {
  jobType: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  createdById: string;
  priority?: string;
  queueName?: string;
  scheduledAt?: Date;
  maxAttempts?: number;
}

export async function createJob(params: CreateJobParams): Promise<string | null> {
  try {
    const count = await prisma.backgroundJob.count();
    const jobNumber = `JOB-${String(count + 1).padStart(8, "0")}`;

    const job = await prisma.backgroundJob.create({
      data: {
        jobNumber,
        jobType: params.jobType,
        status: params.scheduledAt ? "PENDING" : "QUEUED",
        priority: (params.priority as any) || "NORMAL",
        queueName: params.queueName || "default",
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload as any,
        scheduledAt: params.scheduledAt,
        maxAttempts: params.maxAttempts || 3,
        createdById: params.createdById,
      },
    });

    await publishJobUpdate({ id: job.id, jobNumber, jobType: params.jobType, status: job.status });

    return job.id;
  } catch (error) {
    logger.error("Failed to create background job", error as Error, "JobEngine");
    return null;
  }
}

export async function processNextJob(queueName = "default"): Promise<boolean> {
  const job = await prisma.backgroundJob.findFirst({
    where: {
      status: { in: ["QUEUED", "RETRYING"] },
      queueName,
      AND: [
        { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
        { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
      ],
    },
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" },
    ],
  });

  if (!job) return false;

  const startTime = Date.now();

  await prisma.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  await publishJobUpdate({ id: job.id, status: "RUNNING", jobType: job.jobType });

  try {
    await executeJob(job);
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });
    await publishJobUpdate({ id: job.id, status: "COMPLETED", jobType: job.jobType, durationMs: Date.now() - startTime });
  } catch (error) {
    const errMsg = (error as Error).message;
    const shouldRetry = job.attempts < job.maxAttempts;

    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: shouldRetry ? "RETRYING" : "FAILED",
        error: errMsg,
        lastError: errMsg,
        nextRetryAt: shouldRetry ? new Date(Date.now() + Math.pow(2, job.attempts) * 60000) : null,
        durationMs: Date.now() - startTime,
      },
    });

    await publishJobUpdate({ id: job.id, status: shouldRetry ? "RETRYING" : "FAILED", error: errMsg });
  }

  return true;
}

async function executeJob(job: any): Promise<void> {
  const payload = job.payload as Record<string, unknown>;

  switch (job.jobType) {
    case "INVOICE_GENERATION":
      break;
    case "PDF_GENERATION":
      break;
    case "KPI_REFRESH":
      break;
    case "REPORT_GENERATION":
      break;
    case "SLA_CHECK":
      const { checkSLAAlerts } = await import("@/lib/sla-engine");
      await checkSLAAlerts();
      break;
    case "SMS":
    case "SMS_BATCH": {
      const smsModule = await import("@/lib/sms");
      let processed = 0;
      const max = job.jobType === "SMS_BATCH" ? 50 : 1;
      while (processed < max) {
        const count = await smsModule.processPendingSms();
        if (count === 0) break;
        processed += count;
      }
      break;
    }
    case "NOTIFICATION_CLEANUP":
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.notification.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo }, archivedAt: { not: null } },
      });
      break;
    default:
      break;
  }
}

export async function getJobStats() {
  const [pending, queued, running, completed, failed, retrying] = await Promise.all([
    prisma.backgroundJob.count({ where: { status: "PENDING" } }),
    prisma.backgroundJob.count({ where: { status: "QUEUED" } }),
    prisma.backgroundJob.count({ where: { status: "RUNNING" } }),
    prisma.backgroundJob.count({ where: { status: "COMPLETED" } }),
    prisma.backgroundJob.count({ where: { status: "FAILED" } }),
    prisma.backgroundJob.count({ where: { status: "RETRYING" } }),
  ]);

  return { pending, queued, running, completed, failed, retrying, total: pending + queued + running + completed + failed + retrying };
}

export async function getJobsByType() {
  const byType = await prisma.backgroundJob.groupBy({
    by: ["jobType"],
    _count: true,
    where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
  });

  return byType.map(t => ({ type: t.jobType, count: t._count }));
}

export async function retryFailedJob(jobId: string): Promise<boolean> {
  try {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        error: null,
        lastError: null,
        nextRetryAt: null,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: "CANCELLED" },
    });
    return true;
  } catch {
    return false;
  }
}
