import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const shipment = await prisma.houseAWB.findFirst({
      where: {
        id,
        OR: [
          { shipperId: customer.id },
          { receiverId: customer.id },
        ],
        deletedAt: null,
      },
      include: {
        masterAWB: {
          select: {
            awbNumber: true, trackingNumber: true, awbPieces: true, awbWeight: true,
            originStation: { select: { code: true, name: true } },
            destinationStation: { select: { code: true, name: true } },
            workflowStatus: true,
          },
        },
        shipper: { select: { name: true } },
        receiver: { select: { name: true } },
        billingRecords: {
          select: { id: true, status: true, totalAmount: true, currency: true, paidAmount: true, remainingAmount: true, createdAt: true },
        },
      },
    });

    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const timeline = await prisma.shipmentTimeline.findMany({
      where: {
        aggregateId: id,
        aggregateType: 'HouseAWB',
        visibility: { in: ['INTERNAL', 'CUSTOMER'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return NextResponse.json({ data: { ...shipment, timeline } });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
