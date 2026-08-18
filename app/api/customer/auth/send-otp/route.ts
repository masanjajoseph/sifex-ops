import { NextRequest, NextResponse } from 'next/server';
import { findCustomerByEmail, findCustomerByPhone, findCustomerByTracking, sendOtp, setTokenCookie } from '@/lib/customer-auth';
import { sendEmail, otpEmailTemplate } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const { email, phone, trackingNumber } = await req.json();
    let customer: any = null;
    let matchedPhone = '';

    if (trackingNumber && phone) {
      const hawb = await findCustomerByTracking(trackingNumber);
      if (!hawb) return NextResponse.json({ error: 'Tracking number not found' }, { status: 404 });
      const receiverPhone = hawb.receiver?.phone;
      const shipperPhone = hawb.shipper?.phone;
      if (!receiverPhone && !shipperPhone) return NextResponse.json({ error: 'No phone on record' }, { status: 404 });
      const cleanedPhone = phone.replace(/[^0-9]/g, '');
      const cleanedReceiver = (receiverPhone || '').replace(/[^0-9]/g, '');
      const cleanedShipper = (shipperPhone || '').replace(/[^0-9]/g, '');
      const matchReceiver = cleanedReceiver && cleanedPhone.includes(cleanedReceiver.slice(-6));
      const matchShipper = cleanedShipper && cleanedPhone.includes(cleanedShipper.slice(-6));
      if (!matchReceiver && !matchShipper) return NextResponse.json({ error: 'Phone does not match' }, { status: 403 });
      customer = hawb.receiver && matchReceiver ? hawb.receiver : (hawb.shipper || null);
      matchedPhone = matchReceiver ? receiverPhone! : (shipperPhone || '');
    } else if (email) {
      customer = await findCustomerByEmail(email);
      if (!customer) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    } else if (phone) {
      customer = await findCustomerByPhone(phone);
      if (!customer) return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'Email, phone, or tracking+phone required' }, { status: 400 });
    }

    const { sessionToken, otp } = await sendOtp(customer.id);
    const cookie = setTokenCookie(sessionToken);

    if (customer.email) {
      const html = otpEmailTemplate(otp, 'sign in to the Customer Portal');
      await sendEmail({
        to: customer.email,
        subject: 'Your SIFEX Login Code',
        html,
      });
    }

    // Send OTP via SMS when using tracking+phone method
    if (trackingNumber && matchedPhone) {
      await sendSms({
        phoneNumber: matchedPhone,
        message: `Your SIFEX login code is: ${otp}. Valid for 10 minutes.`,
        entityType: 'Customer',
        entityId: customer.id,
      });
    }

    return NextResponse.json({ success: true, message: 'OTP sent' }, {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
