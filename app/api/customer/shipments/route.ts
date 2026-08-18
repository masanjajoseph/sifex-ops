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
    const search = searchParams.get('search') || undefined;

    const where: any = {
      OR: [
        { shipperId: customer.id },
        { receiverId: customer.id },
      ],
      deletedAt: null,
    };
    if (status) where.workflowStatus = status;
    if (search) {
      where.OR = [
        { houseAWBNumber: { contains: search, mode: 'insensitive' } },
        { masterAWB: { awbNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const shipments = await prisma.houseAWB.findMany({
      where,
      include: {
        masterAWB: { select: { awbNumber: true, originStation: { select: { code: true } }, destinationStation: { select: { code: true } } } },
        shipper: { select: { name: true } },
        receiver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: shipments });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
