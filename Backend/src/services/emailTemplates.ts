import { sendEmail, wrapEmailHtml } from './email.service';
import config from '../config/config';

// ─── Email templates ────────────────────────────────────────────────────────
// Each template returns a fire-and-forget promise. Callers should NOT await
// the result inside a request handler — emails are best-effort and slow
// network calls to Resend should never delay an API response.
//
// Convention: every template function logs internally on failure and never
// throws. Use them like:
//
//   sendWelcomeEmail(user).catch(() => undefined);
//
// or simply ignore the return value.

// ─── Small HTML helpers ─────────────────────────────────────────────────────
const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:#8c3232; border-radius:6px;">
        <a href="${href}" style="display:inline-block; padding:12px 24px; color:#fff; text-decoration:none; font-size:14px; font-weight:600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

const heading = (text: string) => `
  <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size:24px; font-weight:700; color:#e8e8e8; margin:0 0 16px;">
    ${text}
  </h1>`;

const paragraph = (html: string) => `
  <p style="font-size:14px; line-height:1.7; color:#c8c8c8; margin:0 0 16px;">${html}</p>`;

const quoteBlock = (text: string) => `
  <div style="margin:20px 0; padding:16px 20px; background:#0d0d0d; border-left:3px solid #8c3232; border-radius:4px;">
    <div style="font-size:13px; line-height:1.7; color:#c8c8c8; white-space:pre-wrap;">${escapeHtml(text)}</div>
  </div>`;

// Minimal HTML escaper — important since we're injecting user-supplied content
// (ticket message bodies, user names) directly into the HTML email.
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Truncate long bodies in email previews so we don't ship 5KB threads.
function preview(s: string, max = 400): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

// ─── Templates ──────────────────────────────────────────────────────────────

interface WelcomeUser {
  name: string;
  email: string;
}

/**
 * Welcome email sent to a user immediately after registration.
 */
export const sendWelcomeEmail = async (user: WelcomeUser): Promise<boolean> => {
  const safeName = escapeHtml(user.name);
  const dashboardUrl = `${config.frontendUrl}/dashboard`;

  const bodyHtml = `
    ${heading(`Welcome, ${safeName}.`)}
    ${paragraph(`Your VoyageurAI account is ready. We're glad to have you.`)}
    ${paragraph(`You have <strong>${config.freeTripLimit} free AI-generated itineraries</strong> to start with. Your first trip is just a few questions away — pick a destination, set your dates and budget, and our AI will draft a complete day-by-day plan tailored to your preferences.`)}
    ${button('Plan Your First Trip', dashboardUrl)}
    ${paragraph(`Need help? Just reply to this email or visit our <a href="${config.frontendUrl}/support" style="color:#8c3232; text-decoration:none; border-bottom:1px solid rgba(140,50,50,0.4);">support page</a>.`)}
    ${paragraph(`Safe travels,<br/>The VoyageurAI Team`)}
  `;

  const text = `Welcome, ${user.name}.

Your VoyageurAI account is ready. You have ${config.freeTripLimit} free AI-generated itineraries to start with.

Plan your first trip: ${dashboardUrl}

Need help? Reply to this email or visit ${config.frontendUrl}/support.

Safe travels,
The VoyageurAI Team`;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to VoyageurAI',
    text,
    html: wrapEmailHtml({
      preheader: `Your account is ready — ${config.freeTripLimit} free itineraries waiting.`,
      bodyHtml,
    }),
  });
};

interface TicketRef {
  _id: { toString(): string } | string;
  name: string;
  email: string;
  category: string;
  message: string;
}

/**
 * Notify admin that a new support ticket has been created.
 *
 * Sent to config.adminEmail. The reply-to header is set to the user's email
 * so the admin can reply directly from their email client (in production —
 * in test mode the reply still goes to the user but Resend just won't deliver
 * it until the domain is verified).
 */
export const sendNewTicketAdminEmail = async (ticket: TicketRef): Promise<boolean> => {
  const id = typeof ticket._id === 'string' ? ticket._id : ticket._id.toString();
  const adminTicketUrl = `${config.frontendUrl}/admin/support?ticketId=${id}`;

  const bodyHtml = `
    ${heading('New Support Ticket')}
    ${paragraph(`A user just submitted a new support ticket.`)}
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:16px 0;">
      <tr><td style="padding:6px 0; font-size:13px; color:#888;">From:</td><td style="padding:6px 0; font-size:13px; color:#e8e8e8;">${escapeHtml(ticket.name)} &lt;${escapeHtml(ticket.email)}&gt;</td></tr>
      <tr><td style="padding:6px 0; font-size:13px; color:#888;">Category:</td><td style="padding:6px 0; font-size:13px; color:#e8e8e8;">${escapeHtml(ticket.category)}</td></tr>
      <tr><td style="padding:6px 0; font-size:13px; color:#888;">Ticket ID:</td><td style="padding:6px 0; font-size:13px; color:#e8e8e8; font-family:monospace;">${escapeHtml(id)}</td></tr>
    </table>
    ${quoteBlock(preview(ticket.message))}
    ${button('Open in Admin Panel', adminTicketUrl)}
  `;

  const text = `New Support Ticket

From: ${ticket.name} <${ticket.email}>
Category: ${ticket.category}
Ticket ID: ${id}

${preview(ticket.message)}

Open in admin panel: ${adminTicketUrl}`;

  return sendEmail({
    to: config.adminEmail,
    replyTo: ticket.email, // admin can reply directly to user
    subject: `[Ticket] New: ${ticket.category} from ${ticket.name}`,
    text,
    html: wrapEmailHtml({
      preheader: `${ticket.name} — ${preview(ticket.message, 80)}`,
      bodyHtml,
    }),
  });
};

/**
 * Notify admin that a user has added a message to an existing ticket.
 */
export const sendUserReplyAdminEmail = async (
  ticket: TicketRef,
  messageText: string
): Promise<boolean> => {
  const id = typeof ticket._id === 'string' ? ticket._id : ticket._id.toString();
  const adminTicketUrl = `${config.frontendUrl}/admin/support?ticketId=${id}`;

  const bodyHtml = `
    ${heading('User Reply on Ticket')}
    ${paragraph(`<strong>${escapeHtml(ticket.name)}</strong> just added a new message to their open ticket.`)}
    ${quoteBlock(preview(messageText))}
    ${button('Reply in Admin Panel', adminTicketUrl)}
    ${paragraph(`<small style="color:#888;">Ticket ID: <code style="font-family:monospace;">${escapeHtml(id)}</code></small>`)}
  `;

  const text = `User Reply on Ticket

${ticket.name} just added a new message to their open ticket.

"${preview(messageText)}"

Reply in admin panel: ${adminTicketUrl}
Ticket ID: ${id}`;

  return sendEmail({
    to: config.adminEmail,
    replyTo: ticket.email,
    subject: `[Ticket] Reply from ${ticket.name}`,
    text,
    html: wrapEmailHtml({
      preheader: preview(messageText, 100),
      bodyHtml,
    }),
  });
};

/**
 * Notify the user that an admin has replied to their ticket.
 *
 * In Resend test mode this will only deliver if the user's email matches the
 * registered Resend account. Once a domain is verified, it works for all users.
 */
export const sendAdminReplyUserEmail = async (
  ticket: TicketRef,
  messageText: string
): Promise<boolean> => {
  const id = typeof ticket._id === 'string' ? ticket._id : ticket._id.toString();
  const userTicketUrl = `${config.frontendUrl}/support?ticketId=${id}`;

  const bodyHtml = `
    ${heading('We replied to your ticket')}
    ${paragraph(`Hi ${escapeHtml(ticket.name)}, our support team has replied to your ticket.`)}
    ${quoteBlock(preview(messageText))}
    ${button('View Full Conversation', userTicketUrl)}
    ${paragraph(`You can reply to this thread directly in the support page on VoyageurAI.`)}
  `;

  const text = `We replied to your ticket

Hi ${ticket.name}, our support team has replied to your ticket:

"${preview(messageText)}"

View the full conversation: ${userTicketUrl}`;

  return sendEmail({
    to: ticket.email,
    subject: 'VoyageurAI Support — Reply on your ticket',
    text,
    html: wrapEmailHtml({
      preheader: preview(messageText, 100),
      bodyHtml,
    }),
  });
};