import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_DURATION_MS = 10 * 60 * 1000;

export function generateToken(): string {
  return randomBytes(48).toString('hex');
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function findCustomerByEmail(email: string) {
  return prisma.customer.findFirst({
    where: { email, deletedAt: null, isActive: true },
  });
}

export async function findCustomerByPhone(phone: string) {
  return prisma.customer.findFirst({
    where: { phone, deletedAt: null, isActive: true },
  });
}

export async function findCustomerByTracking(trackingNumber: string) {
  return prisma.houseAWB.findFirst({
    where: {
      OR: [
        { houseAWBNumber: trackingNumber },
        { masterAWB: { trackingNumber } },
      ],
    },
    include: {
      shipper: true,
      receiver: true,
      masterAWB: true,
    },
  });
}

export async function sendOtp(customerId: string): Promise<{ sessionToken: string; otp: string }> {
  const token = generateToken();
  const otp = generateOtp();
  const now = new Date();

  await prisma.customerSession.create({
    data: {
      customerId,
      token,
      otpCode: otp,
      otpExpiresAt: new Date(now.getTime() + OTP_DURATION_MS),
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      otpAttempts: 0,
    },
  });

  return { sessionToken: token, otp };
}

export async function verifyOtp(sessionToken: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const session = await prisma.customerSession.findUnique({
    where: { token: sessionToken },
    include: { customer: true },
  });

  if (!session) return { success: false, error: 'Session not found' };
  if (session.otpVerified) return { success: false, error: 'OTP already verified' };
  if (!session.otpCode || !session.otpExpiresAt) return { success: false, error: 'No OTP sent' };
  if (new Date() > session.otpExpiresAt) return { success: false, error: 'OTP expired' };
  if (session.otpAttempts >= 5) return { success: false, error: 'Too many attempts' };

  if (session.otpCode !== otp) {
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { otpAttempts: { increment: 1 } },
    });
    return { success: false, error: 'Invalid OTP' };
  }

  await prisma.customerSession.update({
    where: { id: session.id },
    data: {
      otpVerified: true,
      otpCode: null,
      otpExpiresAt: null,
      lastUsedAt: new Date(),
    },
  });

  return { success: true };
}

export async function getCustomerFromToken(token: string) {
  const session = await prisma.customerSession.findUnique({
    where: { token },
    include: { customer: true },
  });

  if (!session) return null;
  if (!session.otpVerified) return null;
  if (session.expiresAt && new Date() > session.expiresAt) return null;

  await prisma.customerSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return session.customer;
}

export function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/customer_session=([^;]+)/);
  return match ? match[1] : null;
}

export function setTokenCookie(token: string): string {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `customer_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearTokenCookie(): string {
  return `customer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
