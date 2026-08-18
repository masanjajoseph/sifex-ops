import { createWorker, enqueue } from "..";
import { env } from "@/lib/env";
import { sendEmail as sendEmailResend } from "@/lib/email";

async function sendSms(phone: string, message: string): Promise<void> {
  if (env.SMS_PROVIDER === "twilio") {
    const { default: twilio } = await import("twilio");
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ body: message, to: phone, from: env.TWILIO_PHONE });
  }
}

export const notificationWorker = createWorker("notification", async (job) => {
  const { type, to, subject, body, message } = job.data as {
    type: "email" | "sms";
    to: string;
    subject?: string;
    body?: string;
    message?: string;
  };

  if (type === "email" && to && subject && body) {
    await sendEmailResend({ to, subject, html: body });
  }

  if (type === "sms" && to && message) {
    await sendSms(to, message);
  }
});

export async function enqueueEmail(to: string, subject: string, body: string) {
  return enqueue("notification", "send-email", { type: "email", to, subject, body });
}

export async function enqueueSms(to: string, message: string) {
  return enqueue("notification", "send-sms", { type: "sms", to, message });
}
