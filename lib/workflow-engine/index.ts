import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit";
import { eventBus, createEvent } from "@/lib/events/event-bus";
import { publishMasterAWBUpdate, publishHouseAWBUpdate, publishBillingUpdate, publishToKpiChannel, publishActivityFeedUpdate, publishWorkflowUpdate } from "@/lib/realtime/publisher";
import { AppError, ForbiddenError } from "@/lib/errors";
import { CargoStatus, WorkflowStage } from "@/types/cargo-domain";
import { syncWorkflowStage, syncChildWorkflowStages } from "@/features/cargo/workflows/workflow-stage.workflow";
import { getModuleForStatus, findTransition, WORKFLOW_DEFINITIONS, getHawbTargetStatus } from "./definitions";
import { WorkflowModule, WorkflowContext, WorkflowResult } from "./types";
import { sendCrossModuleNotification } from "@/lib/notifications";
import { enqueueEntity } from "@/lib/queue-engine";
import { startSLATracking, completeSLATracking } from "@/lib/sla-engine";
import { evaluateRulesForWorkflowTransition } from "@/lib/rules-engine";
import { createActivityFeedEntry } from "@/lib/activity-feed";

const CARGO_STATUS_MAP: Record<string, CargoStatus> = {
  DRAFT: CargoStatus.INITIATED,
  VALIDATED: CargoStatus.ACCEPTED,
  HAWB_GENERATED: CargoStatus.RCS,
  MAWB_ASSIGNED: CargoStatus.RCS,
  READY_FOR_MANIFEST: CargoStatus.RCS,
  MANIFEST_CREATED: CargoStatus.MANIFESTED,
  MANIFESTED: CargoStatus.MANIFESTED,
  FLIGHT_ASSIGNED: CargoStatus.LOADED,
  DISPATCHED: CargoStatus.DEPARTED,
  IN_TRANSIT: CargoStatus.IN_TRANSIT,
  RECEIVED: CargoStatus.ARRIVED,
  VERIFIED: CargoStatus.RELEASED,
  WAREHOUSE_RECEIVING: CargoStatus.RELEASED,
  AWAITING_STORAGE: CargoStatus.RELEASED,
  STORED: CargoStatus.RELEASED,
  INVOICE_GENERATED: CargoStatus.AWAITING_DELIVERY,
  WAITING_PAYMENT: CargoStatus.AWAITING_DELIVERY,
  PAID: CargoStatus.AWAITING_DELIVERY,
  WAITING_DELIVERY: CargoStatus.AWAITING_DELIVERY,
  RIDER_ASSIGNED: CargoStatus.AWAITING_DELIVERY,
  OUT_FOR_DELIVERY: CargoStatus.OUT_FOR_DELIVERY,
  DELIVERED: CargoStatus.DELIVERED,
  COMPLETED: CargoStatus.POD_SIGNED,
};

const STATUS_TO_WORKFLOW_STAGE: Record<string, WorkflowStage> = {
  DRAFT: WorkflowStage.EXPORT,
  VALIDATED: WorkflowStage.EXPORT,
  HAWB_GENERATED: WorkflowStage.EXPORT,
  MAWB_ASSIGNED: WorkflowStage.EXPORT,
  READY_FOR_MANIFEST: WorkflowStage.EXPORT,
  MANIFEST_CREATED: WorkflowStage.EXPORT,
  MANIFESTED: WorkflowStage.EXPORT,
  FLIGHT_ASSIGNED: WorkflowStage.EXPORT,
  DISPATCHED: WorkflowStage.EXPORT,
  IN_TRANSIT: WorkflowStage.IMPORT,
  RECEIVED: WorkflowStage.IMPORT,
  VERIFIED: WorkflowStage.IMPORT,
  WAREHOUSE_RECEIVING: WorkflowStage.WAREHOUSE,
  AWAITING_STORAGE: WorkflowStage.WAREHOUSE,
  STORED: WorkflowStage.WAREHOUSE,
  INVOICE_GENERATED: WorkflowStage.WAREHOUSE,
  WAITING_PAYMENT: WorkflowStage.WAREHOUSE,
  PAID: WorkflowStage.DELIVERY,
  WAITING_DELIVERY: WorkflowStage.DELIVERY,
  RIDER_ASSIGNED: WorkflowStage.DELIVERY,
  OUT_FOR_DELIVERY: WorkflowStage.DELIVERY,
  DELIVERED: WorkflowStage.COMPLETED,
  COMPLETED: WorkflowStage.COMPLETED,
};

export class WorkflowEngine {
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    const { entityType, entityId, fromStatus, toStatus, module, userId, metadata } = context;

    const action = (context as any).action || "";
    const transition = findTransition(fromStatus, action);
    if (!transition) {
      throw new AppError(`Invalid transition: ${fromStatus} → ${toStatus} for action ${action}`, 400, "INVALID_TRANSITION");
    }

    if (transition.requiredPermission !== "system:auto") {
      const hasPermission = context.userPermissions
        ? context.userPermissions.includes(transition.requiredPermission)
        : await this.checkPermission(userId, transition.requiredPermission);
      if (!hasPermission) {
        throw new ForbiddenError(`Missing permission: ${transition.requiredPermission}`);
      }
    }

    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        branchId: true,
        department: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      const cargoStatus = CARGO_STATUS_MAP[toStatus] || CargoStatus.INITIATED;
      const workflowStage = STATUS_TO_WORKFLOW_STAGE[toStatus] || WorkflowStage.EXPORT;
      const departmentId = userInfo?.departmentId || null;
      const branchId = userInfo?.branchId || null;

      const hawbStatus = context.hawbToStatus || transition.hawbToStatus;
      const skipCascade = context.skipHouseAWBCascade || false;

      if (action === "GENERATE_MANIFEST" && entityType === "MasterAWB") {
        const mawb = await tx.masterAWB.findUnique({
          where: { id: entityId },
          select: { flightNumber: true, originStationId: true, destinationStationId: true, awbPieces: true, awbWeight: true, volume: true },
        });

        const allHawbs = await tx.houseAWB.findMany({
          where: { masterAWBId: entityId, deletedAt: null },
          select: { id: true, pieces: true, weight: true, volume: true },
        });

        const totalPieces = allHawbs.reduce((s: number, h: any) => s + h.pieces, 0);
        const totalWeight = allHawbs.reduce((s: number, h: any) => s + h.weight, 0);
        const totalVolume = allHawbs.reduce((s: number, h: any) => s + h.volume, 0);

        const manifestCount = await tx.manifest.count();
        const manifestNumber = `MFT-${String(manifestCount + 1).padStart(6, '0')}`;

        const flightId = context.metadata?.flightId as string;
        if (!flightId) {
          throw new AppError("flightId is required for manifest generation", 400, "VALIDATION_ERROR");
        }

        await tx.manifest.create({
          data: {
            flightId,
            manifestNumber,
            manifestType: "EXPORT",
            status: "CREATED",
            totalWeight,
            totalVolume,
            totalPieces,
            masterAWBIds: [entityId],
            createdAt: new Date(),
          },
        });

        await tx.masterAWB.update({
          where: { id: entityId },
          data: {
            manifestNumber,
            manifestedAt: new Date(),
          },
        });
      }

      await this.updateStatus(tx, entityType, entityId, toStatus, cargoStatus, workflowStage, {
        hawbToStatus: hawbStatus,
        relatedHaWbIds: context.relatedHaWbIds,
        skipHouseAWBCascade: skipCascade,
      });

      await createAuditLog({
        userId,
        action: "UPDATE",
        entity: entityType,
        entityId,
        departmentId: departmentId || undefined,
        workflowStage,
        oldStatus: fromStatus,
        newStatus: toStatus,
        metadata: {
          module: module,
          fromStatus,
          toStatus,
          cargoStatus,
          workflowStage,
          action,
          ...metadata,
        },
      });

      await tx.shipmentTimeline.create({
        data: {
          aggregateId: entityId,
          aggregateType: entityType,
          eventType: `workflow.${module.toLowerCase()}.${toStatus.toLowerCase()}`,
          title: transition.auditEvent?.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Status changed to ${toStatus}`,
          description: transition.notificationMessage || `Shipment moved from ${fromStatus} to ${toStatus}`,
          userId,
          departmentId,
          branchId,
          workflowStage: workflowStage,
          oldStatus: fromStatus,
          newStatus: toStatus,
          action,
          visibility: "INTERNAL",
          metadata: { fromStatus, toStatus, module, action, cargoStatus, workflowStage },
        },
      });

      if (hawbStatus && entityType === "MasterAWB") {
        const hawbWhere: any = { masterAWBId: entityId, deletedAt: null };
        if (context.relatedHaWbIds && context.relatedHaWbIds.length > 0) {
          hawbWhere.id = { in: context.relatedHaWbIds };
        }
        const hawbsToUpdate = await tx.houseAWB.findMany({ where: hawbWhere, select: { id: true } });

        for (const hawb of hawbsToUpdate) {
          await createAuditLog({
            userId,
            action: "UPDATE",
            entity: "HouseAWB",
            entityId: hawb.id,
            departmentId: departmentId || undefined,
            workflowStage,
            oldStatus: fromStatus,
            newStatus: hawbStatus,
            metadata: {
              module,
              fromStatus,
              toStatus: hawbStatus,
              cargoStatus: CARGO_STATUS_MAP[hawbStatus] || CargoStatus.RCS,
              workflowStage,
              action,
              parentAction: action,
            },
          });

          await tx.shipmentTimeline.create({
            data: {
              aggregateId: hawb.id,
              aggregateType: "HouseAWB",
              eventType: `workflow.${module.toLowerCase()}.${hawbStatus.toLowerCase()}`,
              title: `Assigned to Manifest: ${hawbStatus.replace(/_/g, ' ')}`,
              description: `House AWB updated to ${hawbStatus} via MAWB action: ${action}`,
              userId,
              departmentId,
              branchId,
              workflowStage,
              oldStatus: fromStatus,
              newStatus: hawbStatus,
              action,
              visibility: "INTERNAL",
              metadata: { fromStatus, toStatus: hawbStatus, module, action, parentAction: action },
            },
          });

          await createActivityFeedEntry({
            eventType: `workflow.${module.toLowerCase()}.${hawbStatus.toLowerCase()}`,
            title: `House AWB: ${hawbStatus.replace(/_/g, ' ')}`,
            description: `House AWB updated to ${hawbStatus} via MAWB action: ${action}`,
            entityType: "HouseAWB",
            entityId: hawb.id,
            userId,
            userName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'System' : 'System',
            departmentId: userInfo?.departmentId || undefined,
            departmentName: userInfo?.department?.name || undefined,
            branchId: userInfo?.branchId || undefined,
            branchName: userInfo?.branch?.name || undefined,
            workflowStage: workflowStage || undefined,
            oldStatus: fromStatus,
            newStatus: hawbStatus,
            action: action || undefined,
            priority: "NORMAL",
            metadata: { fromStatus, toStatus: hawbStatus, module, action, parentAction: action },
          });

          await publishHouseAWBUpdate(hawb.id, {
            workflowStatus: hawbStatus,
            cargoStatus: CARGO_STATUS_MAP[hawbStatus] || CargoStatus.RCS,
            module,
            workflowStage,
          });
        }
      }

      await createActivityFeedEntry({
        eventType: `workflow.${module.toLowerCase()}.${toStatus.toLowerCase()}`,
        title: transition.auditEvent?.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Status changed to ${toStatus}`,
        description: transition.notificationMessage || `Shipment moved from ${fromStatus} to ${toStatus}`,
        entityType,
        entityId,
        userId,
        userName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'System' : 'System',
        departmentId: userInfo?.departmentId || undefined,
        departmentName: userInfo?.department?.name || undefined,
        branchId: userInfo?.branchId || undefined,
        branchName: userInfo?.branch?.name || undefined,
        workflowStage: workflowStage || undefined,
        oldStatus: fromStatus,
        newStatus: toStatus,
        action: action || undefined,
        priority: "NORMAL",
        metadata: { fromStatus, toStatus, module, action, cargoStatus },
      });

      await publishActivityFeedUpdate({
        eventType: `workflow.${module.toLowerCase()}.${toStatus.toLowerCase()}`,
        title: transition.auditEvent?.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Status changed to ${toStatus}`,
        entityType,
        entityId,
        userId,
        departmentId: userInfo?.departmentId,
        departmentName: userInfo?.department?.name,
        newStatus: toStatus,
        module,
      });

      if (transition.notificationEvent && transition.notificationTargetModule) {
        await sendCrossModuleNotification({
          fromModule: module,
          toModule: transition.notificationTargetModule,
          eventType: transition.notificationEvent,
          entityType,
          entityId,
          message: transition.notificationMessage || `Status updated to ${toStatus}`,
          userId,
          metadata: { fromStatus, toStatus, workflowStage, departmentCode: userInfo?.department?.code },
        });
      }

      await eventBus.publish(
        createEvent(
          `workflow.${module.toLowerCase()}.${toStatus.toLowerCase()}`,
          entityType,
          entityId,
          { fromStatus, toStatus, cargoStatus, workflowStage, module, departmentId, branchId, ...metadata },
          userId,
        ),
      );

      await this.publishRealtimeUpdate(entityType, entityId, toStatus, cargoStatus, module, workflowStage, action);

      await publishToKpiChannel({
        event: "workflow_transition",
        entityType,
        entityId,
        module,
        fromStatus,
        toStatus,
        workflowStage,
      });

      await enqueueEntity(entityType, entityId, null, toStatus, undefined, undefined, undefined, undefined, undefined, departmentId).catch(() => {});
      await startSLATracking(entityType, entityId, null, toStatus).catch(() => {});
      await evaluateRulesForWorkflowTransition(entityType, entityId, toStatus, { fromStatus, module, workflowStage }).catch(() => {});

      if (toStatus === "DELIVERED" || toStatus === "COMPLETED" || toStatus === "PAID" || toStatus === "STORED") {
        await completeSLATracking(entityType, entityId).catch(() => {});
      }

      if (transition.sideEffects) {
        for (const effect of transition.sideEffects) {
          await this.executeSideEffect(tx, effect, entityType, entityId, userId, toStatus);
        }
      }

      if (toStatus === "WAREHOUSE_RECEIVING") {
        await this.autoGenerateInvoice(tx, entityType, entityId, userId);
      }

      if (toStatus === "PAID") {
        await this.moveToDelivery(tx, entityType, entityId, userId);
      }

      if (toStatus === "STORED" && (action === "ASSIGN_SHELF" || action === "ASSIGN_BIN")) {
        const locId = (context as any).metadata?.locationId as string;
        if (locId && entityType === "MasterAWB") {
          const masterAWB = await tx.masterAWB.findUnique({
            where: { id: entityId },
            select: { id: true, destinationStationId: true, awbPieces: true, awbWeight: true, volume: true },
          });
          if (masterAWB) {
            const hawbs = await tx.houseAWB.findMany({
              where: { masterAWBId: entityId, deletedAt: null },
              select: { id: true },
            });
            for (const hawb of hawbs) {
              const existing = await tx.warehouseInventory.findFirst({
                where: { houseAWBId: hawb.id, deletedAt: null },
              });
              if (existing) {
                await tx.warehouseInventory.update({
                  where: { id: existing.id },
                  data: { storageLocationId: locId, status: "RACKED", storedAt: new Date() },
                });
              } else if (masterAWB.destinationStationId) {
                await tx.warehouseInventory.create({
                  data: {
                    stationId: masterAWB.destinationStationId,
                    storageLocationId: locId,
                    houseAWBId: hawb.id,
                    masterAWBId: entityId,
                    status: "RACKED",
                    quantity: 1,
                    weight: masterAWB.awbWeight || 0,
                    volume: masterAWB.volume || 0,
                    receivedAt: new Date(),
                    storedAt: new Date(),
                  },
                });
              }
            }
          }
        }
      }

      await publishWorkflowUpdate(module, {
        action,
        entityType,
        entityId,
        fromStatus,
        toStatus,
        workflowStage,
        departmentId,
      });

      await this.executeAutoTransitions(tx, entityType, entityId, toStatus, userId, module, userInfo?.departmentId, userInfo?.branchId);

      if (transition.chainTo) {
        const chainCargoStatus = CARGO_STATUS_MAP[transition.chainTo] || CargoStatus.INITIATED;
        const chainWorkflowStage = STATUS_TO_WORKFLOW_STAGE[transition.chainTo] || WorkflowStage.EXPORT;

        await this.updateStatus(tx, entityType, entityId, transition.chainTo, chainCargoStatus, chainWorkflowStage, {
          hawbToStatus: hawbStatus,
          relatedHaWbIds: context.relatedHaWbIds,
          skipHouseAWBCascade: skipCascade,
        });

        await createAuditLog({
          userId,
          action: "UPDATE",
          entity: entityType,
          entityId,
          departmentId: departmentId || undefined,
          workflowStage: chainWorkflowStage,
          oldStatus: toStatus,
          newStatus: transition.chainTo,
          metadata: {
            module,
            fromStatus: toStatus,
            toStatus: transition.chainTo,
            cargoStatus: chainCargoStatus,
            workflowStage: chainWorkflowStage,
            action: `chain:${action}`,
            chained: true,
            ...metadata,
          },
        });

        await tx.shipmentTimeline.create({
          data: {
            aggregateId: entityId,
            aggregateType: entityType,
            eventType: `workflow.chain.${transition.chainTo.toLowerCase()}`,
            title: `Chain: ${transition.chainTo.replace(/_/g, ' ')}`,
            description: `Auto-chained from ${toStatus} to ${transition.chainTo}`,
            userId,
            departmentId,
            branchId,
            workflowStage: chainWorkflowStage,
            oldStatus: toStatus,
            newStatus: transition.chainTo,
            action: `chain:${action}`,
            visibility: "INTERNAL",
            metadata: { fromStatus: toStatus, toStatus: transition.chainTo, module, action: `chain:${action}`, chained: true },
          },
        });

        await enqueueEntity(entityType, entityId, null, transition.chainTo, undefined, undefined, undefined, undefined, undefined, departmentId).catch(() => {});
        await startSLATracking(entityType, entityId, null, transition.chainTo).catch(() => {});

        await publishWorkflowUpdate(module, {
          action: `chain:${action}`,
          entityType,
          entityId,
          fromStatus: toStatus,
          toStatus: transition.chainTo,
          workflowStage: chainWorkflowStage,
          departmentId,
        });
      }

      return {
        success: true,
        newStatus: toStatus,
        newWorkflowStage: workflowStage,
        auditLogId: null,
      };
    }, { maxWait: 10000, timeout: 30000 });

    return result;
  }

  private async checkPermission(userId: string, permission: string): Promise<boolean> {
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
    if (!user) return false;
    return (user as any).userRoles?.some((ur: any) =>
      ur.role.rolePermissions.some((rp: any) => rp.permission.code === permission)
    );
  }

  private async updateStatus(
    tx: any,
    entityType: string,
    entityId: string,
    workflowStatus: string,
    cargoStatus: CargoStatus,
    workflowStage: WorkflowStage,
    options?: {
      hawbToStatus?: string;
      relatedHaWbIds?: string[];
      skipHouseAWBCascade?: boolean;
    },
  ): Promise<void> {
    if (entityType === "MasterAWB") {
      await tx.masterAWB.update({
        where: { id: entityId },
        data: {
          cargoStatus,
          workflowStage,
          workflowStatus,
        },
      });

      if (options?.skipHouseAWBCascade) return;

      if (options?.hawbToStatus) {
        const hawbStatus = options.hawbToStatus;
        const hawbCargoStatus = CARGO_STATUS_MAP[hawbStatus] || cargoStatus;
        const hawbWorkflowStage = STATUS_TO_WORKFLOW_STAGE[hawbStatus] || workflowStage;

        const hawbWhere: any = { masterAWBId: entityId, deletedAt: null };
        if (options.relatedHaWbIds && options.relatedHaWbIds.length > 0) {
          hawbWhere.id = { in: options.relatedHaWbIds };
        }

        await tx.houseAWB.updateMany({
          where: hawbWhere,
          data: {
            workflowStatus: hawbStatus,
            cargoStatus: hawbCargoStatus,
            workflowStage: hawbWorkflowStage,
          },
        });
      } else {
        await tx.houseAWB.updateMany({
          where: { masterAWBId: entityId, deletedAt: null },
          data: { cargoStatus, workflowStage, workflowStatus },
        });
      }
    } else if (entityType === "HouseAWB") {
      await tx.houseAWB.update({
        where: { id: entityId },
        data: {
          cargoStatus,
          workflowStage,
          workflowStatus,
        },
      });
    } else if (entityType === "BillingRecord") {
      await tx.billingRecord.update({
        where: { id: entityId },
        data: { status: workflowStatus as any },
      });
    } else if (entityType === "DeliveryAssignment") {
      await tx.deliveryAssignment.update({
        where: { id: entityId },
        data: { status: workflowStatus },
      });
    } else if (entityType === "DeliveryTask") {
      const updateData: any = { status: workflowStatus };
      if (workflowStatus === "ASSIGNED") updateData.assignedAt = new Date();
      if (workflowStatus === "STARTED") updateData.startedAt = new Date();
      if (workflowStatus === "ARRIVED") updateData.arrivedAt = new Date();
      if (workflowStatus === "DELIVERED") updateData.deliveredAt = new Date();
      if (workflowStatus === "COMPLETED") updateData.completedAt = new Date();
      if (workflowStatus === "CANCELLED") updateData.cancelledAt = new Date();
      await tx.deliveryTask.update({
        where: { id: entityId },
        data: updateData,
      });
    }
  }

  private async publishRealtimeUpdate(
    entityType: string,
    entityId: string,
    workflowStatus: string,
    cargoStatus: CargoStatus,
    module?: WorkflowModule,
    workflowStage?: WorkflowStage,
    action?: string,
  ): Promise<void> {
    const updates: Record<string, unknown> = { cargoStatus, workflowStatus, module, workflowStage, action };
    if (entityType === "MasterAWB") {
      await publishMasterAWBUpdate(entityId, updates);
    } else if (entityType === "HouseAWB") {
      await publishHouseAWBUpdate(entityId, updates);
    } else if (entityType === "BillingRecord") {
      await publishBillingUpdate(entityId, { status: workflowStatus, ...updates });
    } else if (entityType === "DeliveryTask") {
    }
  }

  private async executeSideEffect(
    tx: any,
    effect: any,
    entityType: string,
    entityId: string,
    userId: string,
    toStatus: string,
  ): Promise<void> {
    if (effect.type === "UPDATE_RELATED" && effect.target === "workflowStage") {
      const stage = (effect.data as any)?.stage as WorkflowStage;
      if (entityType === "MasterAWB") {
        await tx.masterAWB.update({
          where: { id: entityId },
          data: { workflowStage: stage },
        });
        await tx.houseAWB.updateMany({
          where: { masterAWBId: entityId, deletedAt: null },
          data: { workflowStage: stage },
        });
      } else if (entityType === "HouseAWB") {
        await tx.houseAWB.update({
          where: { id: entityId },
          data: { workflowStage: stage },
        });
      }
    }
  }

  private async autoGenerateInvoice(
    tx: any,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    if (entityType === "HouseAWB") {
      const existing = await tx.billingRecord.findFirst({
        where: { houseAWBId: entityId, deletedAt: null },
      });
      if (existing) return;

      const hawb = await tx.houseAWB.findUnique({
        where: { id: entityId },
        include: { masterAWB: true },
      });
      if (!hawb) return;

      await tx.billingRecord.create({
        data: {
          createdById: userId,
          houseAWBId: hawb.id,
          masterAWBId: hawb.masterAWBId,
          customerId: hawb.shipperId,
          status: "WAITING_PAYMENT",
          totalAmount: hawb.freight || 0,
          currency: hawb.currency,
          billingCharges: {
            create: [
              {
                type: "AIRLINE_FREIGHT",
                amount: hawb.freight || 0,
                currency: hawb.currency,
                description: `Air freight (${hawb.freightRate}/kg × ${hawb.chargeableWeight} kg)`,
              },
            ],
          },
        },
      });

      await tx.houseAWB.update({
        where: { id: entityId },
        data: { billingStatus: "WAITING_PAYMENT" as any },
      });
    } else if (entityType === "MasterAWB") {
      const hawbs = await tx.houseAWB.findMany({
        where: { masterAWBId: entityId, deletedAt: null },
        include: { masterAWB: true },
      });
      for (const hawb of hawbs) {
        const existing = await tx.billingRecord.findFirst({
          where: { houseAWBId: hawb.id, deletedAt: null },
        });
        if (existing) continue;

        await tx.billingRecord.create({
          data: {
            createdById: userId,
            houseAWBId: hawb.id,
            masterAWBId: entityId,
            customerId: hawb.shipperId,
            status: "WAITING_PAYMENT",
            totalAmount: hawb.freight || 0,
            currency: hawb.currency,
            billingCharges: {
              create: [
                {
                  type: "AIRLINE_FREIGHT",
                  amount: hawb.freight || 0,
                  currency: hawb.currency,
                  description: `Air freight (${hawb.freightRate}/kg × ${hawb.chargeableWeight} kg)`,
                },
              ],
            },
          },
        });

        await tx.houseAWB.update({
          where: { id: hawb.id },
          data: { billingStatus: "WAITING_PAYMENT" as any },
        });
      }
    }
  }

  private async moveToDelivery(
    tx: any,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    if (entityType === "BillingRecord") {
      const record = await tx.billingRecord.findUnique({
        where: { id: entityId },
        include: {
          houseAWB: {
            include: { receiver: true, masterAWB: true },
          },
        },
      });
      if (!record?.houseAWBId) return;

      const hawb = record.houseAWB;
      if (!hawb) return;

      await tx.houseAWB.update({
        where: { id: hawb.id },
        data: {
          cargoStatus: CargoStatus.AWAITING_DELIVERY,
          workflowStage: WorkflowStage.DELIVERY,
        },
      });

      const taskCount = await tx.deliveryTask.count();
      const taskNumber = `TASK-${String(taskCount + 1).padStart(6, '0')}`;

      await tx.deliveryTask.create({
        data: {
          taskNumber,
          houseAWBId: hawb.id,
          masterAWBId: hawb.masterAWBId,
          customerName: hawb.receiver?.name || null,
          deliveryAddress: hawb.receiver?.address || null,
          status: "WAITING_ASSIGNMENT",
          createdById: userId,
        },
      });
    }
  }

  private async executeAutoTransitions(
    tx: any,
    entityType: string,
    entityId: string,
    fromStatus: string,
    userId: string,
    module: WorkflowModule,
    departmentId?: string | null,
    branchId?: string | null,
  ): Promise<void> {
    for (const def of Object.values(WORKFLOW_DEFINITIONS)) {
      for (const transition of def.transitions) {
        if (transition.from === fromStatus && transition.autoTrigger) {
          const cargoStatus = CARGO_STATUS_MAP[transition.to] || CargoStatus.INITIATED;
          const workflowStage = STATUS_TO_WORKFLOW_STAGE[transition.to] || WorkflowStage.EXPORT;
          const action = transition.action || "";

          const hawbToStatus = transition.hawbToStatus;

          await this.updateStatus(tx, entityType, entityId, transition.to, cargoStatus, workflowStage, {
            hawbToStatus,
          });

          await createAuditLog({
            userId,
            action: "UPDATE",
            entity: entityType,
            entityId,
            departmentId: departmentId || undefined,
            workflowStage,
            oldStatus: fromStatus,
            newStatus: transition.to,
            metadata: {
              module,
              fromStatus,
              toStatus: transition.to,
              cargoStatus,
              workflowStage,
              action,
              autoTriggered: true,
            },
          });

          await tx.shipmentTimeline.create({
            data: {
              aggregateId: entityId,
              aggregateType: entityType,
              eventType: `workflow.auto.${transition.to.toLowerCase()}`,
              title: transition.auditEvent?.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Auto: ${transition.to}`,
              description: transition.notificationMessage || `Auto transition to ${transition.to}`,
              userId,
              departmentId,
              branchId,
              workflowStage,
              oldStatus: fromStatus,
              newStatus: transition.to,
              action,
              visibility: "INTERNAL",
              metadata: { fromStatus, toStatus: transition.to, module, action, autoTriggered: true },
            },
          });

          await createActivityFeedEntry({
            eventType: `workflow.auto.${transition.to.toLowerCase()}`,
            title: transition.auditEvent?.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || `Auto: ${transition.to}`,
            description: transition.notificationMessage || `Auto transition to ${transition.to}`,
            entityType,
            entityId,
            userId,
            userName: 'System',
            departmentId: departmentId || undefined,
            branchId: branchId || undefined,
            workflowStage: workflowStage || undefined,
            oldStatus: fromStatus,
            newStatus: transition.to,
            action: action || undefined,
            priority: "NORMAL",
            metadata: { fromStatus, toStatus: transition.to, module, autoTriggered: true },
          });

          if (transition.notificationEvent && transition.notificationTargetModule) {
            await sendCrossModuleNotification({
              fromModule: module,
              toModule: transition.notificationTargetModule,
              eventType: transition.notificationEvent,
              entityType,
              entityId,
              message: transition.notificationMessage || `Auto status update to ${transition.to}`,
              userId,
              metadata: { fromStatus, toStatus: transition.to, workflowStage, autoTriggered: true },
            });
          }

          await eventBus.publish(
            createEvent(
              `workflow.auto.${transition.to.toLowerCase()}`,
              entityType,
              entityId,
              { fromStatus, toStatus: transition.to, cargoStatus, workflowStage, module, autoTriggered: true, departmentId, branchId },
              userId,
            ),
          );

          await publishToKpiChannel({
            event: "auto_transition",
            entityType,
            entityId,
            module,
            fromStatus,
            toStatus: transition.to,
            workflowStage,
          });

          if (transition.to === "WAITING_PAYMENT") {
            await this.autoGenerateInvoice(tx, entityType, entityId, userId);
          }

          await this.executeAutoTransitions(tx, entityType, entityId, transition.to, userId, module, departmentId, branchId);
        }
      }
    }
  }
}

export const workflowEngine = new WorkflowEngine();
