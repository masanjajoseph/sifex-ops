import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/services/email";
import { createAuditLog } from "@/features/auth/permissions.service";

const SALT_ROUNDS = 12;
const INVITATION_EXPIRY_HOURS = 48;

export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createUserWithInvitation(params: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  departmentId?: string;
  positionId?: string;
  branchId?: string;
  roleIds: string[];
  invitedById: string;
}) {
  const { email, firstName, lastName, phone, departmentId, positionId, branchId, roleIds, invitedById } = params;

  const tempPassword = generateTemporaryPassword();
  const hashedPassword = await hash(tempPassword, SALT_ROUNDS);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      status: "INVITED",
      departmentId,
      positionId,
      branchId,
      invitedAt: new Date(),
      invitationToken: token,
      invitationExpiresAt: expiresAt,
      passwordResetRequired: true,
      userRoles: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    include: {
      userRoles: { include: { role: true } },
      department: true,
    },
  });

  await prisma.invitation.create({
    data: {
      userId: user.id,
      email,
      token,
      temporaryPassword: tempPassword,
      expiresAt,
      sentAt: new Date(),
    },
  });

  await createAuditLog({
    userId: invitedById,
    action: "INVITATION_SENT",
    entity: "Invitation",
    entityId: user.id,
    metadata: { email, invitedUserId: user.id },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${appUrl}/accept-invitation?token=${token}`;

  await sendInvitationEmail({
    to: email,
    name: `${firstName} ${lastName}`,
    temporaryPassword: tempPassword,
    invitationUrl,
  });

  return user;
}

export async function acceptInvitation(token: string, newPassword: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!invitation) throw new Error("Invalid invitation token");
  if (invitation.status !== "PENDING") throw new Error("Invitation already used");
  if (invitation.expiresAt < new Date()) throw new Error("Invitation has expired");

  const hashedPassword = await hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: invitation.userId },
      data: {
        password: hashedPassword,
        status: "ACTIVE",
        invitationToken: null,
        invitationExpiresAt: null,
        passwordResetRequired: false,
        emailVerified: new Date(),
        firstLoginAt: new Date(),
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  return { userId: invitation.userId };
}

export async function completeFirstLogin(userId: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (!user.passwordResetRequired) throw new Error("Password reset not required");

  const hashedPassword = await hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      passwordResetRequired: false,
      status: "ACTIVE",
      firstLoginAt: new Date(),
      emailVerified: new Date(),
      invitedAt: user.invitedAt ?? new Date(),
    },
  });

  return { success: true };
}
