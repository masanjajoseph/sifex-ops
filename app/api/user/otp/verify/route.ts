import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { sendEmail, pinChangedEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { code, pin } = await req.json();
  if (!code || !pin)
    return apiError(new Error("Code and pin are required"), 400);

  if (typeof pin !== "string" || !/^\d{4,10}$/.test(pin))
    return apiError(new Error("PIN must be 4-10 digits"), 400);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      otpCode: true,
      otpExpiresAt: true,
      otpType: true,
      otpAttempts: true,
    },
  });

  if (!user || !user.otpCode || !user.otpExpiresAt || user.otpType !== "PIN_CHANGE")
    return apiError(new Error("No verification code requested"), 400);

  if (user.otpAttempts >= 5)
    return apiError(new Error("Too many failed attempts. Request a new code."), 429);

  if (new Date() > user.otpExpiresAt)
    return apiError(new Error("Verification code has expired"), 400);

  if (user.otpCode !== code) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { otpAttempts: { increment: 1 } },
    });
    return apiError(new Error("Invalid verification code"), 400);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      signaturePin: await hash(pin, 10),
      otpCode: null,
      otpExpiresAt: null,
      otpType: null,
      otpAttempts: 0,
    },
  });

  await sendEmail({
    to: session.user.email,
    subject: "Signature PIN Changed",
    html: pinChangedEmailTemplate(),
  });

  return apiSuccess({ message: "PIN updated successfully" });
});
