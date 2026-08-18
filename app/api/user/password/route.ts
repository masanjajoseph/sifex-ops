import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return apiError(new Error("Unauthorized"), 401);

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return apiError(new Error("Current password and new password are required"), 400);
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return apiError(new Error("New password must be at least 6 characters"), 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user) return apiError(new Error("User not found"), 404);

  const isValid = await compare(currentPassword, user.password);
  if (!isValid) return apiError(new Error("Current password is incorrect"), 400);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: await hash(newPassword, 12) },
  });

  return apiSuccess({ message: "Password updated successfully" });
});
