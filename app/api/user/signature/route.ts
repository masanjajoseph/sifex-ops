import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { sendEmail, pinChangedEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { signatureImage: true, avatar: true },
  });

  const pinUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { signaturePin: true },
  });
  const hasPin = !!pinUser?.signaturePin;

  return apiSuccess({
    signatureImage: user?.signatureImage || null,
    avatar: user?.avatar || null,
    hasPin,
  });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.signatureImage !== undefined) data.signatureImage = body.signatureImage;

  if (body.pin !== undefined) {
    if (typeof body.pin !== "string" || !/^\d{4,10}$/.test(body.pin))
      return apiError(new Error("PIN must be 4-10 digits"), 400);
    data.signaturePin = await hash(body.pin, 10);
    sendEmail({
      to: session.user.email,
      subject: "Signature PIN Set",
      html: pinChangedEmailTemplate(),
    }).catch(() => {});
  }

  if (Object.keys(data).length === 0) return apiError(new Error("No fields to update"), 400);

  await prisma.user.update({
    where: { id: session.user.id },
    data: data as any,
  });

  return apiSuccess({ message: "Signature settings updated" });
});
