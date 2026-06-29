import { publish } from ".";
import { CHANNELS, EVENTS } from "./channels";

export async function publishMasterAWBUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.MASTER_AWB(id), EVENTS.UPDATED, data);
  await publish(CHANNELS.DASHBOARD, EVENTS.UPDATED, { type: "master-awb", id });
}

export async function publishMasterAWBStatus(id: string, status: string, data: unknown): Promise<void> {
  await publish(CHANNELS.MASTER_AWB(id), EVENTS.STATUS_CHANGED, { status, ...data });
  await publish(CHANNELS.DASHBOARD, EVENTS.STATUS_CHANGED, { type: "master-awb", id, status });
}

export async function publishHouseAWBUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.HOUSE_AWB(id), EVENTS.UPDATED, data);
}

export async function publishHouseAWBStatus(id: string, status: string, data: unknown): Promise<void> {
  await publish(CHANNELS.HOUSE_AWB(id), EVENTS.STATUS_CHANGED, { status, ...data });
}

export async function publishBillingUpdate(id: string, data: unknown): Promise<void> {
  await publish(CHANNELS.BILLING(id), EVENTS.UPDATED, data);
}

export async function publishPaymentReceived(billingId: string, data: unknown): Promise<void> {
  await publish(CHANNELS.BILLING(billingId), EVENTS.PAYMENT_RECEIVED, data);
  await publish(CHANNELS.DASHBOARD, EVENTS.PAYMENT_RECEIVED, { billingId });
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
