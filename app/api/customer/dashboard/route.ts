import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allShipments = await prisma.houseAWB.findMany({
      where: {
        OR: [{ shipperId: customer.id }, { receiverId: customer.id }],
        deletedAt: null,
      },
      select: { workflowStatus: true, createdAt: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await prisma.billingRecord.findMany({
      where: { customerId: customer.id },
      select: { status: true, remainingAmount: true, totalAmount: true },
    });

    const inTransit = allShipments.filter(s =>
      ['IN_TRANSIT', 'DISPATCHED'].includes(s.workflowStatus || '')
    ).length;
    const atOrigin = allShipments.filter(s =>
      ['DRAFT', 'VALIDATED', 'HAWB_GENERATED', 'MAWB_ASSIGNED', 'MANIFEST_CREATED', 'FLIGHT_ASSIGNED'].includes(s.workflowStatus || '')
    ).length;
    const customs = allShipments.filter(s =>
      ['RECEIVED', 'VERIFIED', 'WAREHOUSE_RECEIVING'].includes(s.workflowStatus || '')
    ).length;
    const inStore = allShipments.filter(s =>
      ['AWAITING_STORAGE', 'STORED'].includes(s.workflowStatus || '')
    ).length;
    const outForDelivery = allShipments.filter(s =>
      ['WAITING_PAYMENT', 'PAID', 'WAITING_ASSIGNMENT', 'ASSIGNED', 'STARTED', 'ARRIVED'].includes(s.workflowStatus || '')
    ).length;
    const delivered = allShipments.filter(s =>
      ['DELIVERED', 'COMPLETED'].includes(s.workflowStatus || '')
    ).length;
    const arrivedToday = allShipments.filter(s =>
      new Date(s.createdAt) >= today
    ).length;

    const unpaidInvoices = invoices.filter(i => i.status === 'WAITING_PAYMENT');
    const totalOutstanding = unpaidInvoices.reduce((sum, i) => sum + i.remainingAmount, 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);

    return NextResponse.json({
      data: {
        totalShipments: allShipments.length,
        inTransit, atOrigin, customs, inStore, outForDelivery, delivered,
        arrivedToday,
        totalInvoices: invoices.length,
        unpaidInvoices: unpaidInvoices.length,
        totalOutstanding,
        totalInvoiced,
        outstandingCount: unpaidInvoices.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
