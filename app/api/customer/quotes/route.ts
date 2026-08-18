import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const rand = crypto.randomInt(10000, 99999);
    const quoteNumber = `QR-${rand}`;

    const quote = await prisma.quotationRequest.create({
      data: {
        customerId: customer.id,
        quoteNumber,
        status: 'SUBMITTED',
        shipperName: body.shipperName || null,
        shipperCompany: body.shipperCompany || null,
        shipperAddress: body.shipperAddress || null,
        shipperPhone: body.shipperPhone || null,
        shipperEmail: body.shipperEmail || null,
        shipmentType: body.shipmentType || null,
        description: body.description || null,
        pieces: body.pieces || 0,
        weight: body.weight || 0,
        volume: body.volume || 0,
        chargeableWeight: body.chargeableWeight || 0,
        length: body.length || 0,
        width: body.width || 0,
        height: body.height || 0,
        originStationId: body.originStationId || null,
        destinationStationId: body.destinationStationId || null,
      },
    });

    return NextResponse.json({ success: true, data: quote }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to submit quote' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const quotes = await prisma.quotationRequest.findMany({
      where: { customerId: customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, data: quotes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch quotes' }, { status: 500 });
  }
}
