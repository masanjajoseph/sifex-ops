import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ data: tickets });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: customer.id,
        message,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
