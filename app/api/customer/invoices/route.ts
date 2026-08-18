import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const where: any = { customerId: customer.id };
    if (status) where.status = status;

    const invoices = await prisma.billingRecord.findMany({
      where,
      include: {
        billingCharges: { select: { type: true, amount: true, description: true } },
        payments: { select: { amount: true, paymentMethod: true, paymentDate: true } },
        houseAWB: { select: { houseAWBNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: invoices });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
