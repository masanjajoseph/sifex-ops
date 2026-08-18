import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerFromToken, getTokenFromCookie } from '@/lib/customer-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const customer = await getCustomerFromToken(token);
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const record = await prisma.billingRecord.findUnique({
      where: { id, deletedAt: null },
      include: {
        billingCharges: true,
        payments: true,
        customer: true,
        signedBy: {
          select: { id: true, firstName: true, lastName: true, signatureImage: true, position: { select: { name: true } } },
        },
      },
    });

    if (!record || record.customerId !== customer.id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const houseAWB = record.houseAWBId
      ? await prisma.houseAWB.findUnique({
          where: { id: record.houseAWBId },
          select: {
            id: true,
            houseAWBNumber: true,
            trackingNumber: true,
            chargeableWeight: true,
            freightRate: true,
            description: true,
            shipper: { select: { name: true, phone: true, address: true, city: true, email: true } },
            masterAWB: { select: { awbNumber: true, shipmentType: true, originStation: { select: { name: true, code: true } } } },
          },
        })
      : null;

    const latestRate = await prisma.exchangeRateSnapshot.findFirst({ orderBy: { validAt: 'desc' } });
    const sysSettings = await prisma.systemSettings.findFirst();
    let exchangeRate = 2500;
    if (latestRate && typeof latestRate.rates === 'object' && latestRate.rates !== null) {
      const rates = latestRate.rates as Record<string, unknown>;
      exchangeRate = (rates.exchangeRate as number)
        ?? (rates.TZS as number)
        ?? sysSettings?.exchangeRate
        ?? 2500;
    } else if (sysSettings?.exchangeRate) {
      exchangeRate = sysSettings.exchangeRate;
    }

    const exchangeRateDate = latestRate?.validAt || null;

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        houseAWB,
        exchangeRate,
        exchangeRateDate,
        signedBy: record.signedBy ? {
          name: `${record.signedBy.firstName} ${record.signedBy.lastName}`,
          title: record.signedBy.position?.name || '',
          signatureImage: record.signedBy.signatureImage,
        } : null,
        signedAt: record.signedAt,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 });
  }
}
