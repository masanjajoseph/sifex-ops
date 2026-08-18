import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const houseAWBIds = await prisma.houseAWB.findMany({
      where: {
        OR: [{ shipperId: customer.id }, { receiverId: customer.id }],
        deletedAt: null,
      },
      select: { id: true },
    });

    const ids = houseAWBIds.map(h => h.id);

    const documents = await prisma.document.findMany({
      where: {
        entityType: 'HouseAWB',
        entityId: { in: ids },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: documents });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
