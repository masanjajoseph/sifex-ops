import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createEscalation } from "@/lib/escalation-engine";
import { enqueueEntity } from "@/lib/queue-engine";

type RuleCondition = {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "exists";
  value: unknown;
};

type RuleAction = {
  type: "ENQUEUE" | "ESCALATE" | "NOTIFY" | "SET_PRIORITY" | "UPDATE_METADATA" | "CUSTOM";
  params: Record<string, unknown>;
};

type RuleDefinition = {
  conditions: RuleCondition[];
  logicalOperator: "AND" | "OR";
  actions: RuleAction[];
};

function evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
  const fieldValue = data[condition.field];

  switch (condition.operator) {
    case "eq": return fieldValue === condition.value;
    case "neq": return fieldValue !== condition.value;
    case "gt": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue > condition.value;
    case "gte": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue >= condition.value;
    case "lt": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue < condition.value;
    case "lte": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue <= condition.value;
    case "in": return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "contains": return typeof fieldValue === "string" && String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case "exists": return fieldValue !== undefined && fieldValue !== null;
    default: return false;
  }
}

function evaluateConditions(ruleDef: RuleDefinition, data: Record<string, unknown>): boolean {
  if (ruleDef.conditions.length === 0) return true;

  const results = ruleDef.conditions.map(c => evaluateCondition(c, data));

  if (ruleDef.logicalOperator === "AND") return results.every(Boolean);
  return results.some(Boolean);
}

async function executeActions(
  actions: RuleAction[],
  ruleId: string,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "ENQUEUE":
          await enqueueEntity(
            entityType,
            entityId,
            (data.entityNumber as string) || null,
            (data.workflowStatus as string) || "DRAFT",
            (data.reference as string) || undefined,
            (action.params.priority as string) || "NORMAL",
            data.isVip as boolean,
            data.weight as number,
            data.isDangerous as boolean,
          );
          break;

        case "ESCALATE":
          await createEscalation({
            entityType,
            entityId,
            entityNumber: (data.entityNumber as string) || undefined,
            reason: (action.params.reason as string) || "Business rule triggered",
            severity: (action.params.severity as any) || "HIGH",
            source: "RULE",
            ruleId,
            deadlineMinutes: (action.params.deadlineMinutes as number) || undefined,
          });
          break;

        case "NOTIFY":
          await prisma.notification.create({
            data: {
              userId: (action.params.userId as string) || "system",
              title: (action.params.title as string) || "Rule triggered",
              message: (action.params.message as string) || `Rule ${ruleId} executed`,
              type: "RULE_EXECUTION",
              priority: (action.params.priority as any) || "NORMAL",
              entityType,
              entityId,
            },
          });
          break;

        case "SET_PRIORITY":
          break;

        case "UPDATE_METADATA":
          break;
      }
    } catch (error) {
      logger.error(`Failed to execute rule action: ${action.type}`, error as Error, "RulesEngine");
    }
  }
}

export async function evaluateRules(
  trigger: string,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const rules = await prisma.businessRule.findMany({
    where: {
      trigger: trigger as any,
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    const startTime = Date.now();
    const ruleDef = rule.condition as unknown as RuleDefinition;

    try {
      const conditionResult = evaluateConditions(ruleDef, data);

      if (conditionResult) {
        await executeActions(
          rule.actions as unknown as RuleAction[],
          rule.id,
          entityType,
          entityId,
          data,
        );

        await prisma.businessRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });
      }

      await prisma.ruleExecutionLog.create({
        data: {
          ruleId: rule.id,
          entityType,
          entityId,
          trigger: trigger as any,
          conditionResult,
          actionsExecuted: (conditionResult ? rule.actions : []) as any,
          executionMs: Date.now() - startTime,
        },
      });
    } catch (error) {
      await prisma.ruleExecutionLog.create({
        data: {
          ruleId: rule.id,
          entityType,
          entityId,
          trigger: trigger as any,
          conditionResult: false,
          actionsExecuted: [],
          error: (error as Error).message,
          executionMs: Date.now() - startTime,
        },
      });
    }
  }
}

export async function evaluateRulesForWorkflowTransition(
  entityType: string,
  entityId: string,
  workflowStatus: string,
  extraData?: Record<string, unknown>,
): Promise<void> {
  await evaluateRules("ON_WORKFLOW_TRANSITION", entityType, entityId, {
    workflowStatus,
    ...extraData,
  });
}
