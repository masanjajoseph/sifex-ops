// Auth utility functions

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import crypto from "crypto";

export const getSession = async () => {
  return await auth();
};

export const getCurrentUser = async () => {
  const session = await getSession();
  return session?.user;
};

export const requireAuth = async () => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
};

export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, 12);
};

export const generatePasswordResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const createPasswordResetToken = async (email: string) => {
  const token = generatePasswordResetToken();
  const expiry = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { email },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: expiry,
    },
  });

  return token;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });
};
