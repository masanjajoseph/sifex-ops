import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
});

const FROM = process.env.SMTP_FROM || "noreply@sifex.com";

export async function sendInvitationEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  invitationUrl: string;
}) {
  const { to, name, temporaryPassword, invitationUrl } = params;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Sifex Air Cargo ERP</h2>
      <p>Hello ${name},</p>
      <p>Your account has been created. Please use the following credentials to log in:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
      </div>
      <p>You will be required to change your password after your first login.</p>
      <a href="${invitationUrl}"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                border-radius: 6px; text-decoration: none; margin: 16px 0;">
        Accept Invitation
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        This invitation will expire in 48 hours.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Welcome to Sifex — Your Account Credentials",
    html,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const { to, name, resetUrl } = params;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hello ${name},</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                border-radius: 6px; text-decoration: none; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">
        This link will expire in 1 hour.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset Your Sifex Password",
    html,
  });
}
