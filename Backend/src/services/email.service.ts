// Backend/src/services/email.service.ts
import nodemailer from 'nodemailer';
import config from '../config/config';

// Create transporter once and reuse
let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  // Check if SMTP is configured
  if (!config.smtp.user || !config.smtp.pass) {
    if (config.nodeEnv === 'development') {
      console.warn(
        '[email.service] SMTP not configured — emails disabled.\n' +
        'Add SMTP_USER and SMTP_PASS to Backend/.env (use Gmail App Password)'
      );
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  // Verify connection on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('[email.service] SMTP connection error:', error.message);
    } else if (config.nodeEnv === 'development') {
      console.log('[email.service] SMTP ready to send emails');
    }
  });

  return transporter;
};

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/**
 * Send an email via SMTP (Nodemailer).
 * Returns true on success, false otherwise. Never throws.
 */
export const sendEmail = async (params: SendEmailParams): Promise<boolean> => {
  const smtpTransporter = getTransporter();
  
  if (!smtpTransporter) {
    console.warn('[email.service] SMTP not configured — email not sent');
    return false;
  }

  try {
    const info = await smtpTransporter.sendMail({
      from: config.smtp.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo,
    });
    
    if (config.nodeEnv === 'development') {
      console.log(`[email.service] Sent "${params.subject}" → ${params.to} (${info.messageId})`);
    }
    return true;
  } catch (error) {
    console.error(`[email.service] Failed to send "${params.subject}" → ${params.to}:`, 
      error instanceof Error ? error.message : error);
    return false;
  }
};

export const isEmailConfigured = (): boolean => {
  return !!(config.smtp.user && config.smtp.pass);
};

// ─── Layout helper (same styling as before) ───────────────────────────────
interface LayoutOptions {
  preheader?: string;
  bodyHtml: string;
}

export const wrapEmailHtml = ({ preheader, bodyHtml }: LayoutOptions): string => {
  const safePreheader = preheader || '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VoyageurAI</title>
</head>
<body style="margin:0; padding:0; background:#0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#e8e8e8;">
  <span style="display:none; font-size:1px; color:#0d0d0d; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${safePreheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0d0d0d;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; background:#1a1a1a; border:1px solid rgba(255,255,255,0.05); border-radius:8px;">
          <tr>
            <td style="padding:32px 32px 24px; border-bottom:1px solid rgba(255,255,255,0.05);">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size:22px; font-weight:700; color:#e8e8e8;">
                Voyageur<span style="color:#8c3232;">AI</span>
              </div>
              <div style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.1em; margin-top:4px;">
                Pakistan AI Travel Planner
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; border-top:1px solid rgba(255,255,255,0.05); font-size:12px; color:#888; line-height:1.6;">
              You're receiving this email because of activity on your VoyageurAI account.<br>
              If you weren't expecting this, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};