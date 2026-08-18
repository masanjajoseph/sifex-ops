import { sendEmail } from "@/lib/email";

const baseHtml = (content: string) => `<!DOCTYPE html>
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
  .code{background:#f4f4f6;border-radius:8px;padding:16px;text-align:center;font-size:24px;font-weight:700;letter-spacing:4px;color:#d00020;margin:20px 0}
  .box{background:#f9f9fb;border-radius:8px;padding:16px;margin:16px 0;font-size:13px;border:1px solid #eee}
  .box strong{color:#333}
  .box code{background:#eee;padding:2px 8px;border-radius:4px;font-size:14px;color:#d00020}
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

export async function sendInvitationEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  invitationUrl: string;
}) {
  const { to, name, temporaryPassword, invitationUrl } = params;

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">Welcome to SIFEX</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">Hello ${name},</p>
    <p style="margin:12px 0;color:#555;font-size:14px">Your account has been created. Use the credentials below to log in:</p>
    <div class="box">
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
    </div>
    <p style="color:#555;font-size:14px">You will be required to change your password after first login.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${invitationUrl}" class="btn">Accept Invitation</a>
    </div>
    <p style="color:#888;font-size:12px">This invitation expires in 48 hours.</p>
  `);

  return sendEmail({ to, subject: "Welcome to SIFEX — Your Account Credentials", html });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const { to, name, resetUrl } = params;

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111">Reset Your Password</h2>
    <p style="margin:0 0 4px;color:#555;font-size:14px">Hello ${name},</p>
    <p style="margin:12px 0;color:#555;font-size:14px">Click the button below to reset your password:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p style="color:#888;font-size:12px">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
  `);

  return sendEmail({ to, subject: "Reset Your SIFEX Password", html });
}
