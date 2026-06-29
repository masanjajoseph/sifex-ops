export const CHANNELS = {
  MASTER_AWB: (id: string) => `master-awb:${id}`,
  HOUSE_AWB: (id: string) => `house-awb:${id}`,
  BILLING: (id: string) => `billing:${id}`,
  DASHBOARD: "dashboard",
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  TRACKING: (entityType: string, entityId: string) => `tracking:${entityType}:${entityId}`,
} as const;

export const EVENTS = {
  STATUS_CHANGED: "status-changed",
  PAYMENT_RECEIVED: "payment-received",
  UPDATED: "updated",
  CREATED: "created",
  DELETED: "deleted",
  DELIVERY_UPDATED: "delivery-updated",
  NOTIFICATION: "notification",
} as const;
