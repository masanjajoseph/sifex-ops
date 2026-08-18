import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const status = searchParams.get("status") || undefined;
  const riderId = searchParams.get("riderId") || undefined;
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const where: any = { deletedAt: null };
  if (status) where.status = status;
  if (riderId) where.assignedRiderId = riderId;
  if (search) {
    where.OR = [
      { taskNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { deliveryAddress: { contains: search, mode: "insensitive" } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.deliveryTask.findMany({
      where: where as any,
      include: {
        assignedRider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        houseAWB: { select: { houseAWBNumber: true, trackingNumber: true, pieces: true, weight: true } },
        masterAWB: { select: { awbNumber: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.deliveryTask.count({ where: where as any }),
  ]);

  return apiSuccess(items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();

  if (!body.houseAWBId && !body.masterAWBId) {
    return apiError(new AppError("houseAWBId or masterAWBId is required", 400, "VALIDATION_ERROR"));
  }

  const taskCount = await prisma.deliveryTask.count();
  const taskNumber = `TASK-${String(taskCount + 1).padStart(6, '0')}`;

  const task = await prisma.deliveryTask.create({
    data: {
      taskNumber,
      masterAWBId: body.masterAWBId || null,
      houseAWBId: body.houseAWBId || null,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
      pickupAddress: body.pickupAddress || null,
      deliveryAddress: body.deliveryAddress || null,
      priority: body.priority || "NORMAL",
      status: "WAITING_ASSIGNMENT",
      createdById: session.user.id!,
    },
    include: {
      assignedRider: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      houseAWB: { select: { houseAWBNumber: true, trackingNumber: true } },
    },
  });

  return apiSuccess(task, 201);
});
