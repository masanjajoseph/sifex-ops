import { publish } from ".";
import { CHANNELS, EVENTS } from "./channels";

export async function publishMasterAWBUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.MASTER_AWB(id), EVENTS.UPDATED, data);
  await publish(CHANNELS.DASHBOARD, EVENTS.UPDATED, { type: "master-awb", id });
  await publish(CHANNELS.EXPORT, EVENTS.UPDATED, { type: "master-awb", id });
}

export async function publishMasterAWBStatus(id: string, status: string, data: Record<string, unknown>): Promise<void> {
  await publish(CHANNELS.MASTER_AWB(id), EVENTS.STATUS_CHANGED, { status, ...data });
  await publish(CHANNELS.DASHBOARD, EVENTS.STATUS_CHANGED, { type: "master-awb", id, status });
  await publish(CHANNELS.WORKFLOW_QUEUE("export"), EVENTS.QUEUE_UPDATED, { type: "master-awb", id, status });
}

export async function publishHouseAWBUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.HOUSE_AWB(id), EVENTS.UPDATED, data);
  await publish(CHANNELS.IMPORT, EVENTS.UPDATED, data);
}

export async function publishHouseAWBStatus(id: string, status: string, data: Record<string, unknown>): Promise<void> {
  await publish(CHANNELS.HOUSE_AWB(id), EVENTS.STATUS_CHANGED, { status, ...data });
}

export async function publishBillingUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.BILLING(id), EVENTS.UPDATED, data);
  await publish(CHANNELS.BILLING_DEPT, EVENTS.UPDATED, data);
}

export async function publishPaymentReceived(billingId: string, data: unknown): Promise<void> {
  await publish(CHANNELS.BILLING(billingId), EVENTS.PAYMENT_RECEIVED, data);
  await publish(CHANNELS.DASHBOARD, EVENTS.PAYMENT_RECEIVED, { billingId });
  await publish(CHANNELS.BILLING_DEPT, EVENTS.PAYMENT_RECEIVED, { billingId });
}

export async function publishTrackingEvent(
  entityType: string,
  entityId: string,
  data: unknown,
): Promise<void> {
  await publish(CHANNELS.TRACKING(entityType, entityId), EVENTS.UPDATED, data);
}

export async function notifyUser(userId: string, notification: unknown): Promise<void> {
  await publish(CHANNELS.NOTIFICATIONS(userId), EVENTS.NOTIFICATION, notification);
}

export async function publishToKpiChannel(data: unknown): Promise<void> {
  await publish(CHANNELS.KPI, EVENTS.KPI_UPDATED, data);
}

export async function publishQueueUpdate(module: string, data: unknown): Promise<void> {
  await publish(CHANNELS.WORKFLOW_QUEUE(module), EVENTS.QUEUE_UPDATED, data);
}

export async function publishSLAUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.SLA, EVENTS.SLA_UPDATED, data);
  await publish(CHANNELS.DASHBOARD, EVENTS.SLA_UPDATED, data);
}

export async function publishEscalationUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.ESCALATIONS, EVENTS.ESCALATION_UPDATED, data);
}

export async function publishAssignmentUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.ASSIGNMENTS, EVENTS.ASSIGNMENT_UPDATED, data);
}

export async function publishJobUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.JOBS, EVENTS.JOB_UPDATED, data);
}

export async function publishOperationsUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.OPERATIONS, EVENTS.UPDATED, data);
}

export async function publishExecutiveUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.EXECUTIVE, EVENTS.UPDATED, data);
}

export async function publishActivityFeedUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.ACTIVITY_FEED, EVENTS.ACTIVITY_CREATED, data);
}

export async function publishDocumentUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.DOCUMENTS, EVENTS.DOCUMENT_CREATED, data);
}

export async function publishScanUpdate(data: unknown): Promise<void> {
  await publish(CHANNELS.SCANS, EVENTS.SCAN_CREATED, data);
}

export async function publishDepartmentUpdate(departmentId: string, data: unknown): Promise<void> {
  await publish(CHANNELS.DEPARTMENT(departmentId), EVENTS.UPDATED, data);
}

export async function publishBranchUpdate(branchId: string, data: unknown): Promise<void> {
  await publish(CHANNELS.BRANCH(branchId), EVENTS.UPDATED, data);
}

export async function publishWorkflowUpdate(module: string, data: unknown): Promise<void> {
  await publish(CHANNELS.WORKFLOW_QUEUE(module), EVENTS.WORKFLOW_UPDATED, data);
  await publish(CHANNELS[module.toUpperCase() as keyof typeof CHANNELS] as string || CHANNELS.DASHBOARD, EVENTS.WORKFLOW_UPDATED, data);
}
