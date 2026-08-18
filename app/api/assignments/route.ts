import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { autoAssign, acceptAssignment, rejectAssignment, startAssignment, completeAssignment, getLoadByDepartment } from "@/lib/assignment-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const userId = searchParams.get("userId") || session.user.id;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const status = searchParams.get("status") || undefined;

  if (department) {
    const load = await getLoadByDepartment(department);
    return apiSuccess(load);
  }

  const where: any = { assignedToId: userId };
  if (status) where.status = status;

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.assignment.count({ where }),
  ]);

  return apiSuccess({ assignments, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "auto-assign") {
    const result = await autoAssign(body.entityType, body.entityId, body.departmentCode, body.branchId, body.preferredUserId);
    return apiSuccess(result);
  }

  if (action === "accept" && body.assignmentId) {
    await acceptAssignment(body.assignmentId, session.user.id!);
    return apiSuccess({ success: true });
  }

  if (action === "reject" && body.assignmentId) {
    await rejectAssignment(body.assignmentId, session.user.id!, body.reason);
    return apiSuccess({ success: true });
  }

  if (action === "start" && body.assignmentId) {
    await startAssignment(body.assignmentId, session.user.id!);
    return apiSuccess({ success: true });
  }

  if (action === "complete" && body.assignmentId) {
    await completeAssignment(body.assignmentId, session.user.id!);
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
