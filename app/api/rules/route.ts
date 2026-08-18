import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const module = searchParams.get("module");
  const status = searchParams.get("status") || "ACTIVE";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const where: any = { deletedAt: null };
  if (module) where.module = module;
  if (status !== "ALL") where.status = status;

  const [rules, total] = await Promise.all([
    prisma.businessRule.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.businessRule.count({ where }),
  ]);

  return apiSuccess({ rules, total });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const rule = await prisma.businessRule.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        module: body.module,
        trigger: body.trigger || "ON_CONDITION",
        condition: body.condition,
        actions: body.actions,
        priority: body.priority || 0,
        departmentId: body.departmentId,
      },
    });
    return apiSuccess(rule, 201);
  }

  if (action === "update" && body.ruleId) {
    const rule = await prisma.businessRule.update({
      where: { id: body.ruleId },
      data: {
        name: body.name,
        description: body.description,
        condition: body.condition,
        actions: body.actions,
        priority: body.priority,
        status: body.status,
        trigger: body.trigger,
      },
    });
    return apiSuccess(rule);
  }

  if (action === "delete" && body.ruleId) {
    await prisma.businessRule.update({
      where: { id: body.ruleId },
      data: { deletedAt: new Date() },
    });
    return apiSuccess({ success: true });
  }

  return apiError(new AppError("Invalid action", 400, "VALIDATION_ERROR"));
});
