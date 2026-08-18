import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'SIFEX <noreply@sifex.co.tz>';

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .container{max-width:600px;margin:0 auto;padding:24px 16px}
  .header{background:linear-gradient(135deg,#d00020,#a00018);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center}
  .header h1{margin:0;color:#fff;font-size:22px;letter-spacing:-0.3px}
  .header p{margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px}
  .body{background:#fff;border-radius:0 0 12px 12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
  .footer{text-align:center;padding:20px 16px;font-size:12px;color:#888}
  .btn{display:inline-block;background:#d00020;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600}
  .code{background:#f4f4f6;border-radius:8px;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#d00020;margin:20px 0}
  .info{margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:3px solid #d00020;border-radius:4px;font-size:13px;color:#444}
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>SIFEX</h1><p>Air Cargo</p></div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>SIFEX Air Cargo &bull; This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}

export function otpEmailTemplate(code: string, purpose: string): string {
  return baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">Verification Code</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">Use the code below to ${purpose}:</p>
    <div class="code">${code}</div>
    <p style="margin:16px 0 0;color:#888;font-size:13px">
      This code expires in 10 minutes. If you did not request this, please ignore this email.
    </p>
    <div class="info">
      <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
    </div>
  `, 'Verification Code');
}

export function pinChangedEmailTemplate(): string {
  return baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">Signature PIN Changed</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">
      Your invoice signature PIN was successfully changed.
    </p>
    <p style="margin:12px 0 0;color:#888;font-size:13px">
      If you did not make this change, please contact your system administrator immediately.
    </p>
    <div class="info">
      <strong>Time:</strong> ${new Date().toLocaleString()}
    </div>
  `, 'Security Alert');
}

export function invoiceSignedEmailTemplate(params: {
  invoiceId: string;
  signedByName: string;
  amount: string;
  customerName: string;
}): string {
  return baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">Invoice Signed</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">
      Invoice <strong>#${params.invoiceId}</strong> has been digitally signed.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr><td style="padding:6px 0;color:#888">Signed by</td><td style="padding:6px 0;font-weight:600">${params.signedByName}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Customer</td><td style="padding:6px 0;font-weight:600">${params.customerName}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Amount</td><td style="padding:6px 0;font-weight:600">${params.amount}</td></tr>
    </table>
    <p style="margin:0;color:#888;font-size:13px">The invoice is now locked and ready for payment processing.</p>
  `, 'Invoice Signed');
}

export function workflowNotificationEmailTemplate(params: {
  title: string;
  message: string;
  entityRef?: string;
  actionUrl?: string;
}): string {
  const actionHtml = params.actionUrl
    ? `<a href="${params.actionUrl}" class="btn">View Details</a>`
    : '';
  return baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">${params.title}</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">${params.message}</p>
    ${params.entityRef ? `<p style="margin:8px 0;color:#888;font-size:13px">Reference: ${params.entityRef}</p>` : ''}
    ${actionHtml ? `<div style="margin:20px 0">${actionHtml}</div>` : ''}
  `, 'Notification');
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    console.warn('[EMAIL] RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'Resend not configured' };
  }
  try {
    const { data, error } = await client.emails.send({
      from: FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error('[EMAIL] Resend error:', error);
      return { success: false, error: error.message };
    }
    console.log('[EMAIL] Sent:', data?.id);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Exception:', err);
    return { success: false, error: String(err) };
  }
}
