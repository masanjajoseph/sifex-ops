import { NextRequest } from "next/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth-utils";
import { sendEmail, passwordResetEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return apiError(new Error("Email is required"), 400);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  // Always return success to avoid leaking which emails exist.
  if (user) {
    const token = await createPasswordResetToken(email);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Reset Your SIFEX Password",
      html: passwordResetEmailTemplate({ resetUrl }),
    });
  }

  return apiSuccess({
    message: "If an account exists for that email, a password reset link has been sent.",
  });
});