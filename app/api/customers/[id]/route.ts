import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withErrorHandler, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id,  deletedAt: null },
    include: {
      shipperFor: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      receiverFor: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      quotationRequests: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
      billingRecords: { where: { deletedAt: null }, take: 20, orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    return apiError(new NotFoundError("Customer"), 404);
  }

  return apiSuccess(customer);
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id,  deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Customer"), 404);
  }

  const body = await req.json();

  const allowedFields = [
    "type", "name", "code", "email", "phone", "address", "city", "country",
    "taxId", "contactPerson", "contactPhone", "contactEmail",
    "registrationNo", "kycStatus", "creditLimit", "creditBalance",
    "paymentTerms", "isActive",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: data as any,
  });

  return apiSuccess(updated);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError(new Error("Unauthorized"), 401);
  }

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id,  deletedAt: null },
  });

  if (!existing) {
    return apiError(new NotFoundError("Customer"), 404);
  }

  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
});
