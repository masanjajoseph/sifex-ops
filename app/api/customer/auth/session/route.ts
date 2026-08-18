import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromToken, getTokenFromCookie, clearTokenCookie } from '@/lib/customer-auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ customer: null });

    const customer = await getCustomerFromToken(token);
    if (!customer) {
      return NextResponse.json({ customer: null }, {
        headers: { 'Set-Cookie': clearTokenCookie() },
      });
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
      },
    });
  } catch {
    return NextResponse.json({ customer: null });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true }, {
    headers: { 'Set-Cookie': clearTokenCookie() },
  });
}
