import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { createJob, processNextJob, getJobStats, getJobsByType } from "@/lib/job-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const status = searchParams.get("status") || undefined;
  const jobType = searchParams.get("jobType") || undefined;

  if (scope === "stats") {
    const stats = await getJobStats();
    const byType = await getJobsByType();
    return apiSuccess({ ...stats, byType });
  }

  const where: any = {};
  if (status) where.status = status;
  if (jobType) where.jobType = jobType;

  const [jobs, total] = await Promise.all([
    prisma.backgroundJob.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.backgroundJob.count({ where }),
  ]);

  return apiSuccess({ jobs, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const jobId = await createJob({
      jobType: body.jobType,
      entityType: body.entityType,
      entityId: body.entityId,
      payload: body.payload || {},
      createdById: session.user.id!,
      priority: body.priority || "NORMAL",
      queueName: body.queueName,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      maxAttempts: body.maxAttempts || 3,
    });
    return apiSuccess({ id: jobId }, 201);
  }

  if (action === "process") {
    const processed = await processNextJob(body.queueName || "default");
    return apiSuccess({ processed });
  }

  if (action === "cancel" && body.jobId) {
    await prisma.backgroundJob.update({
      where: { id: body.jobId },
      data: { status: "CANCELLED" },
    });
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
