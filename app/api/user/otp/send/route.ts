import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { sendEmail, otpEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const POST = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      otpCode: code,
      otpExpiresAt: expiresAt,
      otpType: "PIN_CHANGE",
      otpAttempts: 0,
    },
  });

  const html = otpEmailTemplate(code, "change your signature PIN");
  await sendEmail({
    to: session.user.email,
    subject: "Your SIFEX Verification Code",
    html,
  });

  return apiSuccess({ message: "Verification code sent to your email" });
});
