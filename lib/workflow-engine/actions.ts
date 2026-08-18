import { prisma } from "@/lib/prisma";
import { WORKFLOW_DEFINITIONS, getModuleForStatus, MODULE_STATUS_MAP } from "./definitions";
import { QuickAction, WorkflowModule } from "./types";

export interface AvailableAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  variant: "primary" | "secondary" | "danger" | "outline" | "ghost";
  requiresPermission?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  reason?: string;
}

export interface ActionContext {
  entityType: "MasterAWB" | "HouseAWB" | "BillingRecord" | "DeliveryAssignment" | "DeliveryTask";
  entityId: string;
  workflowStatus: string;
  workflowStage?: string;
  module: WorkflowModule;
  userPermissions?: string[];
  userId: string;
}

function hasPermission(required: string | undefined, userPermissions: string[] | undefined): boolean {
  if (!required) return true;
  if (!userPermissions) return false;
  return userPermissions.some(p => p === required || p === "admin" || p === "super_admin");
}

const BUSINESS_RULES: Record<string, (ctx: ActionContext) => boolean> = {
  ASSIGN_SHELF: () => true,
  PRINT_LABEL: () => true,
  ASSIGN_RIDER: () => true,
};

export function getAvailableActions(context: ActionContext): AvailableAction[] {
  const definition = WORKFLOW_DEFINITIONS[context.module];
  if (!definition) return [];

  const statusActions = definition.quickActions[context.workflowStatus];
  if (!statusActions) return [];

  return statusActions
    .filter(a => hasPermission(a.requiresPermission, context.userPermissions))
    .filter(a => {
      const rule = BUSINESS_RULES[a.action];
      return rule ? rule(context) : true;
    })
    .map(a => ({ ...a, reason: undefined }));
}

export async function getAvailableActionsForEntity(
  entityType: string,
  entityId: string,
  userId: string,
  userPermissions?: string[],
): Promise<AvailableAction[]> {
  let status: string | null = null;
  let module: WorkflowModule | undefined;
  let stage: string | undefined;

  if (entityType === "MasterAWB") {
    const entity = await prisma.masterAWB.findUnique({
      where: { id: entityId },
      select: { workflowStatus: true, workflowStage: true },
    });
    if (!entity) return [];
    status = entity.workflowStatus;
    stage = entity.workflowStage;
  } else if (entityType === "HouseAWB") {
    const entity = await prisma.houseAWB.findUnique({
      where: { id: entityId },
      select: { workflowStatus: true, workflowStage: true },
    });
    if (!entity) return [];
    status = entity.workflowStatus;
    stage = entity.workflowStage;
  } else if (entityType === "BillingRecord") {
    const entity = await prisma.billingRecord.findUnique({
      where: { id: entityId },
      select: { status: true },
    });
    if (!entity) return [];
    status = entity.status;
    stage = "BILLING";
  } else if (entityType === "DeliveryTask") {
    const entity = await prisma.deliveryTask.findUnique({
      where: { id: entityId },
      select: { status: true },
    });
    if (!entity) return [];
    status = entity.status;
    stage = "DELIVERY";
  }

  if (!status) return [];

  const normalizedStatus = status === "DRAFT" ? "DRAFT" : status;
  const resolvedModule = getModuleForStatus(normalizedStatus);
  if (!resolvedModule) return [];
  module = resolvedModule;

  let permissions = userPermissions;
  if (!permissions) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (user) {
      permissions = (user as any).userRoles?.flatMap((ur: any) =>
        ur.role.rolePermissions.map((rp: any) => rp.permission.code as string),
      ) || [];
    }
  }

  return getAvailableActions({
    entityType: entityType as any,
    entityId,
    workflowStatus: normalizedStatus,
    workflowStage: stage,
    module,
    userPermissions: permissions || [],
    userId,
  });
}
