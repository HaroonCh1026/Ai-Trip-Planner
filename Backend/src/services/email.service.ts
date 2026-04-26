import config from '../config/config';

// ─── Resend transactional email service ─────────────────────────────────────
// We use Resend's REST API directly via fetch (Node 18+ has native fetch),
// so no SDK install is needed. This keeps dependencies lean and the service
// fully self-contained.
//
// Docs: https://resend.com/docs/api-reference/emails/send-email

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// ─── Public API ────────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  // Plain text body — required for clients that don't render HTML or for
  // accessibility. Resend accepts text and html together; clients pick one.
  text: string;
  // Optional HTML body. If omitted, only the text version is sent.
  html?: string;
  // Optional override for the From address (defaults to RESEND_FROM env var).
  from?: string;
  // Optional reply-to address (e.g. for support tickets so user can reply
  // directly to the admin).
  replyTo?: string;
}

/**
 * Send an email via Resend.
 *
 * Returns true on success, false otherwise. **Never throws** — email is
 * always treated as a best-effort side channel; we don't want a flaky
 * email provider taking down a registration, ticket reply, or password
 * reset request.
 *
 * Callers that need to know about send failures (e.g. password reset,
 * where the user is waiting on the email) should check the return value
 * and surface a generic "if the email doesn't arrive, contact support"
 * message instead of failing the whole flow.
 */
export const sendEmail = async (params: SendEmailParams): Promise<boolean> => {
  const apiKey = config.resend.apiKey;
  const fromAddress = params.from || config.resend.from;

  if (!apiKey) {
    if (config.nodeEnv === 'development') {
      console.warn(
        '[email.service] RESEND_API_KEY not set — email skipped. ' +
          'Add it to Backend/.env to enable email features.'
      );
    }
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
        reply_to: params.replyTo,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '<no body>');
      console.error(
        `[email.service] Resend returned ${res.status}: ${errBody.slice(0, 300)}`
      );
      return false;
    }

    if (config.nodeEnv === 'development') {
      console.log(`[email.service] Sent "${params.subject}" → ${params.to}`);
    }
    return true;
  } catch (err) {
    console.error('[email.service] Send failed:', (err as Error).message);
    return false;
  }
};

/**
 * Quick check for callers that want to know whether email is configured.
 * Useful in places where we want to render different UI based on whether
 * a notification will go out.
 */
export const isEmailConfigured = (): boolean => Boolean(config.resend.apiKey);

// ─── Layout helper ─────────────────────────────────────────────────────────
// Wraps body content in a consistent branded HTML shell. All transactional
// emails should use this so they share visual identity. Keep it simple —
// plain HTML, no external CSS, all inline styles, since most email clients
// strip <style> tags or block external resources.

interface LayoutOptions {
  preheader?: string; // 1-line preview text shown in inbox lists
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