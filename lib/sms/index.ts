import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createJob } from "@/lib/job-engine";
import { createActivityFeedEntry } from "@/lib/activity-feed";
import { eventDispatcher } from "@/lib/events/event-dispatcher";
import { createEvent, eventBus } from "@/lib/events/event-bus";
import { EventType } from "@/lib/events/event-types";

export const SMS_TEMPLATES: Record<string, (data: Record<string, string>) => string> = {
  SHIPMENT_RECEIVED: (d) => `Dear ${d.customerName}, your shipment ${d.trackingNumber} has been received at our warehouse. Ref: ${d.reference}.`,
  SHIPMENT_READY: (d) => `Dear ${d.customerName}, your shipment ${d.trackingNumber} is ready for pickup. Please visit our office. Ref: ${d.reference}.`,
  INVOICE_GENERATED: (d) => `Dear ${d.customerName}, invoice ${d.invoiceNumber} for ${d.amount} ${d.currency} has been generated for shipment ${d.trackingNumber}. Ref: ${d.reference}.`,
  PAYMENT_RECEIVED: (d) => `Dear ${d.customerName}, payment of ${d.amount} ${d.currency} received for invoice ${d.invoiceNumber}. Ref: ${d.reference}.`,
  PAYMENT_REMINDER: (d) => `Dear ${d.customerName}, this is a reminder that invoice ${d.invoiceNumber} of ${d.amount} ${d.currency} is due. Ref: ${d.reference}.`,
  OUT_FOR_DELIVERY: (d) => `Dear ${d.customerName}, your shipment ${d.trackingNumber} is out for delivery. ETA: ${d.eta || "Today"}. Ref: ${d.reference}.`,
  SHIPMENT_DELIVERED: (d) => `Dear ${d.customerName}, your shipment ${d.trackingNumber} has been delivered successfully. Thank you! Ref: ${d.reference}.`,
  ASSIGNMENT_CREATED: (d) => `Dear ${d.customerName}, rider ${d.riderName} has been assigned to deliver your shipment ${d.trackingNumber}. Ref: ${d.reference}.`,
  SLA_WARNING: (d) => `Alert: SLA warning for ${d.entityType} ${d.entityNumber}. Current time: ${d.elapsed}. Expected: ${d.slaDeadline}.`,
  ESCALATION_ALERT: (d) => `Alert: Escalation raised for ${d.entityType} ${d.entityNumber}. Level: ${d.level}. Action required.`,
  DOCUMENT_READY: (d) => `Dear ${d.customerName}, document ${d.documentType} ${d.documentNumber} is ready. Download: ${d.link}.`,
  TRACKING_LINK: (d) => `Track your shipment ${d.trackingNumber}: ${d.link}. Ref: ${d.reference}.`,
};

interface SendSmsParams {
  phoneNumber: string;
  message: string;
  templateCode?: string;
  entityType?: string;
  entityId?: string;
  entityNumber?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function sendSms(params: SendSmsParams): Promise<string | null> {
  const user = params.userId
    ? await prisma.user.findUnique({ where: { id: params.userId }, select: { id: true, firstName: true, lastName: true } })
    : null;

  const jobId = await createJob({
    jobType: "SMS",
    entityType: params.entityType,
    entityId: params.entityId,
    payload: {
      phoneNumber: params.phoneNumber,
      message: params.message,
      templateCode: params.templateCode,
      entityType: params.entityType,
      entityId: params.entityId,
      entityNumber: params.entityNumber,
      userId: params.userId,
    },
    createdById: params.userId || "system",
    priority: "NORMAL",
    queueName: "sms",
  });

  const smsRecord = await prisma.smsHistory.create({
    data: {
      phoneNumber: params.phoneNumber,
      message: params.message,
      templateCode: params.templateCode,
      senderId: env.BONGA_SENDER_ID || "SIFEX",
      entityType: params.entityType,
      entityId: params.entityId,
      entityNumber: params.entityNumber,
      provider: (env.SMS_PROVIDER as string) || "bonga",
      status: "PENDING",
      backgroundJobId: jobId || undefined,
      metadata: params.metadata as any || {},
    },
  });

  await eventDispatcher.dispatch(
    createEvent(
      EventType.SMS_SENT,
      params.entityType || "System",
      params.entityId || smsRecord.id,
      { smsId: smsRecord.id, phoneNumber: params.phoneNumber, templateCode: params.templateCode } as any,
      params.userId,
    ),
  );

  if (user) {
    await createActivityFeedEntry({
      eventType: "sms.sent",
      title: `SMS sent to ${params.phoneNumber}`,
      description: params.templateCode ? `Template: ${params.templateCode}` : params.message.slice(0, 100),
      entityType: params.entityType || "SmsHistory",
      entityId: params.entityId || smsRecord.id,
      entityNumber: params.entityNumber,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: "SMS_SENT",
      metadata: { smsRecordId: smsRecord.id, templateCode: params.templateCode },
    });
  }

  return smsRecord.id;
}

export async function sendSmsWithTemplate(
  templateCode: string,
  phoneNumber: string,
  templateData: Record<string, string>,
  options?: { entityType?: string; entityId?: string; entityNumber?: string; userId?: string },
): Promise<string | null> {
  const templateFn = SMS_TEMPLATES[templateCode];
  if (!templateFn) {
    logger.error(`SMS template not found: ${templateCode}`, undefined, "SmsService");
    return null;
  }

  const message = templateFn(templateData);
  return sendSms({
    phoneNumber,
    message,
    templateCode,
    ...options,
  });
}

export async function processPendingSms(): Promise<number> {
  const pending = await prisma.smsHistory.findFirst({
    where: {
      status: "PENDING",
      AND: [
        { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
        { attempts: { lt: prisma.smsHistory.fields.maxAttempts } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!pending) return 0;

  await prisma.smsHistory.update({
    where: { id: pending.id },
    data: { status: "SENDING", attempts: { increment: 1 }, lastAttemptAt: new Date() },
  });

  try {
    let providerResponse: any;

    if (env.SMS_PROVIDER === "bonga") {
      providerResponse = await sendViaBonga(pending.phoneNumber, pending.message);
    } else if (env.SMS_PROVIDER === "twilio") {
      providerResponse = await sendViaTwilio(pending.phoneNumber, pending.message);
    } else {
      providerResponse = { messageId: `log-${Date.now()}`, status: "sent" };
      logger.info(`[SMS LOG] To: ${pending.phoneNumber}, Message: ${pending.message}`, undefined, "SmsService");
    }

    const delivered = providerResponse?.status === "sent" || providerResponse?.status === "delivered";

    await prisma.smsHistory.update({
      where: { id: pending.id },
      data: {
        status: delivered ? "SENT" : "FAILED",
        deliveryStatus: delivered ? "DELIVERED" : "UNDELIVERED",
        providerMessageId: providerResponse?.messageId || null,
        providerResponse: providerResponse || null,
        deliveryAt: delivered ? new Date() : undefined,
        error: delivered ? null : providerResponse?.error,
      },
    });

    if (delivered) {
      await eventDispatcher.dispatch(
        createEvent(EventType.SMS_DELIVERED, pending.entityType || "SmsHistory", pending.id, { smsId: pending.id, phoneNumber: pending.phoneNumber } as any),
      );
    } else {
      await eventDispatcher.dispatch(
        createEvent(EventType.SMS_FAILED, pending.entityType || "SmsHistory", pending.id, { smsId: pending.id, error: providerResponse?.error } as any),
      );
    }

    return 1;
  } catch (error: any) {
    const shouldRetry = pending.attempts < pending.maxAttempts;

    await prisma.smsHistory.update({
      where: { id: pending.id },
      data: {
        status: shouldRetry ? "PENDING" : "FAILED",
        error: error.message,
        nextRetryAt: shouldRetry ? new Date(Date.now() + Math.pow(2, pending.attempts) * 60000) : undefined,
      },
    });

    return 0;
  }
}

async function sendViaBonga(phoneNumber: string, message: string): Promise<any> {
  const apiKey = env.BONGA_API_KEY;
  if (!apiKey) {
    logger.warn("BONGA_API_KEY not configured, logging SMS instead", undefined, "SmsService");
    return { messageId: `log-${Date.now()}`, status: "sent" };
  }

  const response = await fetch(`${env.BONGA_API_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: phoneNumber,
      message,
      sender_id: env.BONGA_SENDER_ID || "SIFEX",
      callback_url: env.BONGA_CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Bonga API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function sendViaTwilio(phoneNumber: string, message: string): Promise<any> {
  logger.info(`[Twilio would send] To: ${phoneNumber}, Msg: ${message}`, undefined, "SmsService");
  return { messageId: `twilio-${Date.now()}`, status: "sent" };
}

export async function getSmsHistory(params: {
  limit?: number;
  offset?: number;
  status?: string;
  phoneNumber?: string;
  entityType?: string;
  entityId?: string;
}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.phoneNumber) where.phoneNumber = params.phoneNumber;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;

  const [records, total] = await Promise.all([
    prisma.smsHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.smsHistory.count({ where }),
  ]);

  return { records, total };
}

export async function handleSmsCallback(payload: {
  messageId: string;
  status: string;
  phoneNumber?: string;
  error?: string;
}): Promise<void> {
  const sms = await prisma.smsHistory.findFirst({
    where: { providerMessageId: payload.messageId },
  });

  if (!sms) {
    logger.warn(`SMS callback for unknown message: ${payload.messageId}`, undefined, "SmsService");
    return;
  }

  await prisma.smsHistory.update({
    where: { id: sms.id },
    data: {
      deliveryStatus: payload.status,
      status: payload.status === "DELIVERED" ? "SENT" : payload.status === "UNDELIVERED" ? "FAILED" : sms.status,
      deliveryAt: payload.status === "DELIVERED" ? new Date() : undefined,
      error: payload.error,
      providerResponse: payload as any,
    },
  });
}
