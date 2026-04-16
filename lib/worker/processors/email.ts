// ── Email processor using Nodemailer ──────────────────────────────────────────
// In development: connects to Mailpit (localhost:1025)
// In production: connects to real SMTP (configure via env)

import nodemailer from 'nodemailer'
import type { EmailJobData } from '../queues'

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {}),
  })

  return _transporter
}

export async function processEmail(data: EmailJobData): Promise<void> {
  const transporter = getTransporter()

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@nexuspos.local',
    to: data.to,
    subject: data.subject,
    html: data.html,
    text: data.text,
  })

  console.log(`✅ Email sent to: ${data.to} — ${data.subject}`)
}

// ── Email template helpers ────────────────────────────────────────────────────

export function welcomeEmailHtml(params: { name: string; tenantName: string; loginUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Inter, Arial, sans-serif; background: #0f0f1a; color: #e0e0f0; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.08); }
  h1 { color: #f37c22; font-size: 28px; margin-bottom: 8px; }
  .btn { display: inline-block; background: linear-gradient(135deg, #f37c22, #e8521a); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 24px; }
  .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
</style></head>
<body>
  <div class="container">
    <h1>Welcome to ${params.tenantName}!</h1>
    <p>Hi ${params.name}, your restaurant POS account is ready.</p>
    <p>Click below to log in and complete your setup:</p>
    <a href="${params.loginUrl}" class="btn">Go to Dashboard →</a>
    <div class="footer">
      <p>NEXUS POS &bull; Made By Dhruv Patel</p>
      <p>If you didn't create this account, ignore this email.</p>
    </div>
  </div>
</body>
</html>`
}

export function passwordResetEmailHtml(params: { name: string; resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Inter, Arial, sans-serif; background: #0f0f1a; color: #e0e0f0; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.08); }
  h1 { color: #f37c22; }
  .btn { display: inline-block; background: linear-gradient(135deg, #f37c22, #e8521a); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 24px; }
  .warning { color: #f59e0b; font-size: 13px; margin-top: 16px; }
</style></head>
<body>
  <div class="container">
    <h1>Password Reset</h1>
    <p>Hi ${params.name}, you requested a password reset.</p>
    <a href="${params.resetUrl}" class="btn">Reset Password →</a>
    <p class="warning">⚠️ This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>`
}
