import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, AppError, NotFoundError } from "@/lib/errors";
import { workflowEngine } from "@/lib/workflow-engine";
import { getModuleForStatus, findTransition } from "@/lib/workflow-engine/definitions";
import { getAvailableActions, ActionContext } from "@/lib/workflow-engine/actions";
import { WorkflowContext, WorkflowModule } from "@/lib/workflow-engine/types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const { entityType, entityId, action, metadata, locationId } = body;

  if (!entityType || !entityId || !action) {
    return apiError(new AppError("entityType, entityId, and action are required", 400, "VALIDATION_ERROR"));
  }

  let currentStatus: string | null = null;
  let record: any = null;

  if (entityType === "MasterAWB") {
    record = await prisma.masterAWB.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = record?.workflowStatus || "DRAFT";
  } else if (entityType === "HouseAWB") {
    record = await prisma.houseAWB.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = record?.workflowStatus || "DRAFT";
  } else if (entityType === "BillingRecord") {
    record = await prisma.billingRecord.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = record?.status || "WAITING_PAYMENT";
  } else if (entityType === "DeliveryAssignment") {
    record = await prisma.deliveryAssignment.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = record?.status || "WAITING_DELIVERY";
  } else if (entityType === "DeliveryTask") {
    record = await prisma.deliveryTask.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = record?.status || "WAITING_ASSIGNMENT";
  }

  if (!record) return apiError(new NotFoundError(`${entityType} not found`));

  const module = getModuleForStatus(currentStatus!);

  if (action === "GET_ACTIONS") {
    const actionContext: ActionContext = {
      entityType: entityType as ActionContext["entityType"],
      entityId,
      workflowStatus: currentStatus!,
      module: module || WorkflowModule.EXPORT,
      userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
      userId: session.user.id!,
    };
    const actions = getAvailableActions(actionContext);
    return apiSuccess({ status: currentStatus!, actions });
  }

  if (!module) {
    return apiError(new AppError(`Unknown module for status ${currentStatus}`, 400, "UNKNOWN_MODULE"));
  }

  const transition = findTransition(currentStatus!, action);
  if (!transition) {
    return apiError(new AppError(`No valid transition found for status ${currentStatus} and action ${action}`, 400, "INVALID_TRANSITION"));
  }

  // --- Special handling for ASSIGN_MAWB ---
  if (action === "ASSIGN_MAWB" && entityType === "MasterAWB") {
    const draftHawbs = await prisma.houseAWB.findMany({
      where: { masterAWBId: entityId, workflowStatus: "DRAFT", deletedAt: null },
      select: { id: true },
    });

    if (draftHawbs.length === 0) {
      return apiError(new AppError("No draft House AWBs to assign. Generate HAWBs first.", 400, "VALIDATION_ERROR"));
    }

    const context: WorkflowContext = {
      entityType: entityType as WorkflowContext["entityType"],
      entityId,
      fromStatus: currentStatus!,
      toStatus: transition.to,
      module,
      userId: session.user.id!,
      departmentId: session.user.departmentId || undefined,
      userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
      hawbToStatus: "READY_FOR_MANIFEST",
      relatedHaWbIds: draftHawbs.map(h => h.id),
      metadata: { action, assignedHawbCount: draftHawbs.length, ...(metadata || {}) },
    };

    Object.defineProperty(context, "action", { value: action, enumerable: true });
    const result = await workflowEngine.execute(context);
    return apiSuccess(result);
  }

  // --- Special handling for GENERATE_MANIFEST ---
  if (action === "GENERATE_MANIFEST" && entityType === "MasterAWB") {
    if (currentStatus !== "MAWB_ASSIGNED") {
      return apiError(new AppError("Master AWB must be in MAWB_ASSIGNED status to generate a manifest.", 400, "VALIDATION_ERROR"));
    }

    const allHawbs = await prisma.houseAWB.findMany({
      where: { masterAWBId: entityId, deletedAt: null },
      select: { id: true, workflowStatus: true },
    });

    if (allHawbs.length === 0) {
      return apiError(new AppError("No House AWBs attached. Assign House AWBs before generating Manifest.", 400, "VALIDATION_ERROR"));
    }

    const notReady = allHawbs.filter(h => h.workflowStatus !== "READY_FOR_MANIFEST" && h.workflowStatus !== "MANIFESTED");
    if (notReady.length > 0) {
      return apiError(new AppError("Assign all House AWBs before generating Manifest.", 400, "VALIDATION_ERROR"));
    }

    const existingManifest = await prisma.manifest.findFirst({
      where: { masterAWBIds: { has: entityId }, status: { notIn: ["CLOSED", "CANCELLED"] } },
    });
    if (existingManifest) {
      return apiError(new AppError("Manifest already exists for this Master AWB.", 400, "VALIDATION_ERROR"));
    }

    const flightId = metadata?.flightId as string;
    if (!flightId) {
      return apiError(new AppError("flightId is required in metadata to generate a manifest.", 400, "VALIDATION_ERROR"));
    }

    const context: WorkflowContext = {
      entityType: entityType as WorkflowContext["entityType"],
      entityId,
      fromStatus: currentStatus!,
      toStatus: transition.to,
      module,
      userId: session.user.id!,
      departmentId: session.user.departmentId || undefined,
      userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
      hawbToStatus: "MANIFESTED",
      metadata: { action, flightId, hawbCount: allHawbs.length, ...(metadata || {}) },
    };

    Object.defineProperty(context, "action", { value: action, enumerable: true });
    const result = await workflowEngine.execute(context);
    return apiSuccess(result);
  }

  // --- Special handling for ASSIGN_FLIGHT ---
  if (action === "ASSIGN_FLIGHT" && entityType === "MasterAWB") {
    const flightId = metadata?.flightId as string;
    if (!flightId) {
      return apiError(new AppError("flightId is required in metadata to assign a flight.", 400, "VALIDATION_ERROR"));
    }

    const flight = await prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) {
      return apiError(new AppError("Flight not found.", 404, "NOT_FOUND"));
    }

    const context: WorkflowContext = {
      entityType: entityType as WorkflowContext["entityType"],
      entityId,
      fromStatus: currentStatus!,
      toStatus: transition.to,
      module,
      userId: session.user.id!,
      departmentId: session.user.departmentId || undefined,
      userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
      metadata: { action, flightId, flightNumber: flight.flightNumber, ...(metadata || {}) },
    };

    Object.defineProperty(context, "action", { value: action, enumerable: true });
    const result = await workflowEngine.execute(context);

    await prisma.masterAWB.update({
      where: { id: entityId },
      data: { flightNumber: flight.flightNumber, airlineId: flight.airlineId },
    });

    return apiSuccess(result);
  }

  // Standard transition
  const context: WorkflowContext = {
    entityType: entityType as WorkflowContext["entityType"],
    entityId,
    fromStatus: currentStatus!,
    toStatus: transition.to,
    module,
    userId: session.user.id!,
    departmentId: session.user.departmentId || undefined,
    userPermissions: session.user.permissions?.length ? session.user.permissions : undefined,
    metadata: { action, ...(locationId ? { locationId } : {}), ...(metadata || {}) },
  };

  Object.defineProperty(context, "action", { value: action, enumerable: true });

  const result = await workflowEngine.execute(context);

  return apiSuccess(result);
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return apiError(new AppError("entityType and entityId are required", 400, "VALIDATION_ERROR"));
  }

  let currentStatus: string | null = null;

  if (entityType === "MasterAWB") {
    const r = await prisma.masterAWB.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = r?.workflowStatus || null;
  } else if (entityType === "HouseAWB") {
    const r = await prisma.houseAWB.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = r?.workflowStatus || null;
  } else if (entityType === "BillingRecord") {
    const r = await prisma.billingRecord.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = r?.status || null;
  } else if (entityType === "DeliveryAssignment") {
    const r = await prisma.deliveryAssignment.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = r?.status || null;
  } else if (entityType === "DeliveryTask") {
    const r = await prisma.deliveryTask.findFirst({ where: { id: entityId, deletedAt: null } });
    currentStatus = r?.status || null;
  }

  if (!currentStatus) {
    return apiSuccess({ status: null, actions: [] });
  }

  let permissions = session.user.permissions;
  if (!permissions) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                rolePermissions: { select: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });
    permissions = user?.userRoles?.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.code)
    ) || [];
  }

  const { getQuickActionsForStatus } = await import("@/lib/workflow-engine/definitions");
  const actions = getQuickActionsForStatus(currentStatus, permissions);

  return apiSuccess({ status: currentStatus, module: getModuleForStatus(currentStatus), actions });
});
