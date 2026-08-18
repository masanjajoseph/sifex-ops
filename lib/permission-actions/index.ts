import { WORKFLOW_DEFINITIONS, getModuleForStatus, MODULE_STATUS_MAP } from "@/lib/workflow-engine/definitions";
import { QuickAction, WorkflowModule } from "@/lib/workflow-engine/types";

export interface PermissionAction {
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
  departmentId?: string;
  departmentCode?: string;
  userPermissions: string[];
  userId: string;
}

function hasPermission(required: string | undefined, userPermissions: string[]): boolean {
  if (!required) return true;
  return userPermissions.some(p => p === required || p === "admin" || p === "super_admin");
}

const BUSINESS_RULES: Record<string, (ctx: ActionContext) => boolean> = {
  ASSIGN_SHELF: (ctx) => true,
  PRINT_LABEL: (ctx) => true,
  ASSIGN_RIDER: (ctx) => true,
};

export function getPermissionActions(context: ActionContext): PermissionAction[] {
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
    .map(a => ({
      id: a.id,
      label: a.label,
      action: a.action,
      icon: a.icon,
      variant: a.variant,
      requiresPermission: a.requiresPermission,
      requiresConfirmation: a.requiresConfirmation,
      confirmationMessage: a.confirmationMessage,
    }));
}
