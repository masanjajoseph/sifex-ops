import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stations = await prisma.station.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, city: true, country: true, type: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, data: stations });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
