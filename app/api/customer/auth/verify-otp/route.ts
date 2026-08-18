import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, getTokenFromCookie, setTokenCookie } from '@/lib/customer-auth';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromCookie(req);
    if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const { otp } = await req.json();
    if (!otp) return NextResponse.json({ error: 'OTP required' }, { status: 400 });

    const result = await verifyOtp(token, otp);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    const cookie = setTokenCookie(token);
    return NextResponse.json({ success: true }, {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
