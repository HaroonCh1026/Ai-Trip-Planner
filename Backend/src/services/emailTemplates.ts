// Backend/src/services/emailTemplates.ts
import { wrapEmailHtml, sendEmail } from './email.service';
import config from '../config/config';

// ─── Welcome Email ─────────────────────────────────────────────────────────
export const welcomeEmailHtml = (name: string): string => {
  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">Welcome to Ai Trip Planner, ${name}! 🎉</h2>
    <p style="margin:0 0 16px; line-height:1.6;">We're thrilled to have you on board. Your AI-powered travel planning journey starts now.</p>
    <p style="margin:0 0 12px; font-weight:600;">With Ai Trip Planner, you can:</p>
    <ul style="margin:0 0 20px; padding-left:20px; line-height:1.6;">
      <li>✨ Generate personalized itineraries</li>
      <li>🌍 Discover hidden gems and local favorites</li>
      <li>💰 Get budget-optimized travel plans</li>
      <li>💬 Get ML-validated cost estimates and feasibility checks</li>
    </ul>
    <div style="text-align:center; margin:28px 0 20px;">
      <a href="${config.frontendUrl}/dashboard" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">Plan Your First Trip →</a>
    </div>
    <p style="margin:20px 0 0; line-height:1.6;">Questions? Reply to this email — we're here to help!</p>
    <p style="margin:20px 0 0; line-height:1.6;">Safe travels,<br><strong>The Ai Trip Planner Team</strong></p>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: 'Welcome to Ai Trip Planner - Start planning your next adventure!' });
};

export const sendWelcomeEmail = async (user: { name: string; email: string }): Promise<boolean> => {
  const html = welcomeEmailHtml(user.name);
  const text = `Welcome to Ai Trip Planner, ${user.name}! Start planning your AI-powered travel adventures today.`;
  
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Ai Trip Planner',
    text,
    html,
  });
};

// ─── Pro Upgrade Confirmation ──────────────────────────────────────────────
export const proUpgradeEmailHtml = (name: string): string => {
  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">You're Pro now, ${name}! ⭐</h2>
    <p style="margin:0 0 16px; line-height:1.6;">Your upgrade to Ai Trip Planner Pro is confirmed. Thank you for the support.</p>
    <p style="margin:0 0 12px; font-weight:600;">Your Pro plan unlocks:</p>
    <ul style="margin:0 0 20px; padding-left:20px; line-height:1.6;">
      <li>♾️ Unlimited AI itineraries</li>
      <li>📄 PDF export and sharing</li>
      <li>💎 Insider Tips for every destination</li>
      <li>⚡ Priority generation</li>
    </ul>
    <div style="text-align:center; margin:28px 0 20px;">
      <a href="${config.frontendUrl}/dashboard" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">Start exploring Pro →</a>
    </div>
    <p style="margin:20px 0 0; line-height:1.6;">Safe travels,<br><strong>The Ai Trip Planner Team</strong></p>
  `;
  return wrapEmailHtml({ bodyHtml: body, preheader: 'Your Ai Trip Planner Pro upgrade is confirmed.' });
};

export const sendProUpgradeEmail = async (user: { name: string; email: string }): Promise<boolean> => {
  if (!user?.email) return false;
  const name = user.name || 'Traveller';
  const html = proUpgradeEmailHtml(name);
  const text = `You're Pro now, ${name}! Your Ai Trip Planner Pro upgrade is confirmed — enjoy unlimited itineraries, PDF export, and Insider Tips.`;
  return sendEmail({
    to: user.email,
    subject: 'Your Ai Trip Planner Pro upgrade is confirmed ⭐',
    text,
    html,
  });
};

// ─── Login Notification ────────────────────────────────────────────────────
export const loginNotificationEmailHtml = (name: string, whenText: string): string => {
  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">New sign-in to your account</h2>
    <p style="margin:0 0 16px; line-height:1.6;">Hi ${name}, we noticed a sign-in to your Ai Trip Planner account on ${whenText} (PKT).</p>
    <p style="margin:0 0 16px; line-height:1.6;">If this was you, there's nothing to do. If you don't recognise it, please reset your password right away.</p>
    <div style="text-align:center; margin:28px 0 20px;">
      <a href="${config.frontendUrl}/forgot-password" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">Secure my account →</a>
    </div>
    <p style="margin:20px 0 0; line-height:1.6;">— The Ai Trip Planner Team</p>
  `;
  return wrapEmailHtml({ bodyHtml: body, preheader: 'New sign-in to your Ai Trip Planner account.' });
};

export const sendLoginNotificationEmail = async (user: { name: string; email: string }): Promise<boolean> => {
  if (!user?.email) return false;
  const name = user.name || 'there';
  const whenText = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const html = loginNotificationEmailHtml(name, whenText);
  const text = `New sign-in to your Ai Trip Planner account on ${whenText} (PKT). If this wasn't you, reset your password.`;
  return sendEmail({
    to: user.email,
    subject: 'New sign-in to your Ai Trip Planner account',
    text,
    html,
  });
};

// ─── New Ticket Admin Email ────────────────────────────────────────────────
export const newTicketAdminEmailHtml = (ticketData: {
  ticketId: string;
  name: string;
  email: string;
  category: string;
  message: string;
}): string => {
  const body = `
    <h2 style="margin:0 0 16px;">📬 New Support Ticket</h2>
    <p style="margin:0 0 12px;"><strong>Ticket ID:</strong> ${ticketData.ticketId}</p>
    <p style="margin:0 0 12px;"><strong>From:</strong> ${ticketData.name} (${ticketData.email})</p>
    <p style="margin:0 0 20px;"><strong>Category:</strong> ${ticketData.category}</p>
    <hr style="border-color:rgba(255,255,255,0.1); margin:20px 0;">
    <h3 style="margin:0 0 12px;">Message:</h3>
    <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:6px; margin-bottom:24px;">
      ${ticketData.message.replace(/\n/g, '<br>')}
    </div>
    <div style="text-align:center;">
      <a href="${config.frontendUrl}/admin/support?ticket=${ticketData.ticketId}" style="display:inline-block; background:#8c3232; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">Open in Admin Panel →</a>
    </div>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: `New support ticket: ${ticketData.category}` });
};

// FIXED: Expects ticket object with _id, name, email, category, message
export const sendNewTicketAdminEmail = async (ticket: {
  _id: any;
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<boolean> => {
  const ticketId = ticket._id.toString();
  const html = newTicketAdminEmailHtml({
    ticketId,
    name: ticket.name,
    email: ticket.email,
    category: ticket.category,
    message: ticket.message,
  });
  const text = `New support ticket #${ticketId} from ${ticket.name}\n\nMessage: ${ticket.message}`;
  
  return sendEmail({
    to: config.adminEmail,
    subject: `[Ticket] New: ${ticket.category} from ${ticket.name}`,
    text,
    html,
  });
};

// ─── User Reply Admin Email ────────────────────────────────────────────────
export const userReplyAdminEmailHtml = (ticketData: {
  ticketId: string;
  name: string;
  message: string;
}): string => {
  const body = `
    <h2 style="margin:0 0 16px;">💬 User Reply on Ticket #${ticketData.ticketId}</h2>
    <p style="margin:0 0 20px;"><strong>${ticketData.name}</strong> replied to their ticket.</p>
    <hr style="border-color:rgba(255,255,255,0.1); margin:20px 0;">
    <h3 style="margin:0 0 12px;">Reply:</h3>
    <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:6px; margin-bottom:24px;">
      ${ticketData.message.replace(/\n/g, '<br>')}
    </div>
    <div style="text-align:center;">
      <a href="${config.frontendUrl}/admin/support?ticket=${ticketData.ticketId}" style="display:inline-block; background:#8c3232; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">View Ticket →</a>
    </div>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: `User replied to ticket #${ticketData.ticketId}` });
};

// FIXED: Expects ticket object AND reply message text
export const sendUserReplyAdminEmail = async (ticket: {
  _id: any;
  name: string;
  email: string;
  category: string;
  message: string;
}, replyText: string): Promise<boolean> => {
  const ticketId = ticket._id.toString();
  const html = userReplyAdminEmailHtml({
    ticketId,
    name: ticket.name,
    message: replyText,
  });
  const text = `User ${ticket.name} replied to ticket #${ticketId}\n\nReply: ${replyText}`;
  
  return sendEmail({
    to: config.adminEmail,
    subject: `[Ticket] Reply from ${ticket.name}`,
    text,
    html,
  });
};

// ─── Admin Reply User Email ────────────────────────────────────────────────
export const adminReplyUserEmailHtml = (ticketData: {
  ticketId: string;
  message: string;
}): string => {
  const body = `
    <h2 style="margin:0 0 16px;">📨 Admin Response to Your Ticket</h2>
    <p style="margin:0 0 12px;"><strong>Ticket #${ticketData.ticketId}</strong> has a new reply from our support team.</p>
    <hr style="border-color:rgba(255,255,255,0.1); margin:20px 0;">
    <h3 style="margin:0 0 12px;">Response:</h3>
    <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:6px; margin-bottom:24px;">
      ${ticketData.message.replace(/\n/g, '<br>')}
    </div>
    <div style="text-align:center;">
      <a href="${config.frontendUrl}/support/my-tickets" style="display:inline-block; background:#8c3232; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">View Your Ticket →</a>
    </div>
    <p style="margin-top:20px; font-size:14px;">Reply directly from your ticket dashboard.</p>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: `Admin replied to your ticket #${ticketData.ticketId}` });
};

// FIXED: Expects ticket object AND reply message text
export const sendAdminReplyUserEmail = async (ticket: {
  _id: any;
  name: string;
  email: string;
  category: string;
  message: string;
}, replyText: string): Promise<boolean> => {
  const ticketId = ticket._id.toString();
  const html = adminReplyUserEmailHtml({
    ticketId,
    message: replyText,
  });
  const text = `Admin replied to your ticket #${ticketId}\n\nResponse: ${replyText}`;
  
  return sendEmail({
    to: ticket.email,
    subject: 'Ai Trip Planner Support — Reply on your ticket',
    text,
    html,
  });
};

// ─── Password Reset Email (Round 6) ────────────────────────────────────────
export const passwordResetEmailHtml = (resetToken: string): string => {
  const resetLink = `${config.frontendUrl}/reset-password/${resetToken}`;
  const body = `
    <h2 style="margin:0 0 16px;">🔐 Password Reset Request</h2>
    <p style="margin:0 0 16px; line-height:1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align:center; margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">Reset Password →</a>
    </div>
    <p style="margin:20px 0 12px; font-size:14px; color:#aaa;">This link will expire in <strong>1 hour</strong>.</p>
    <hr style="border-color:rgba(255,255,255,0.1); margin:20px 0;">
    <p style="margin:0; font-size:13px; color:#888;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
    <p style="margin:10px 0 0; font-size:12px; color:#666;">For security, never share this link with anyone.</p>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: 'Reset your Ai Trip Planner password' });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const html = passwordResetEmailHtml(resetToken);
  const text = `Reset your Ai Trip Planner password by clicking this link: ${config.frontendUrl}/reset-password/${resetToken}. This link expires in 1 hour.`;
  
  return sendEmail({
    to: email,
    subject: 'Ai Trip Planner - Password Reset Request',
    text,
    html,
  });
};

// ─── Round 5b: Booking Confirmation Email ──────────────────────────────────
// Sent automatically when the Stripe webhook flips a Booking from Pending
// to Paid. Real-world tone: confirms the booking, lays out the receipt,
// and sets expectations for next steps (our team will reach out to
// coordinate logistics within 24 hours). No silent demo language —
// reads exactly like a real travel platform's confirmation.
//
// The "our team will be in touch" line is an aspirational placeholder
// for the academic build — there's no actual operations team yet. If
// this gets to production, it should fire a parallel notification to the
// admin/ops channel so a human actually does follow up.
export const bookingConfirmedEmailHtml = (data: {
  userName: string;
  bookingId: string;
  destination: string;
  origin: string;
  days: number;
  startDate: string | null;
  baseAmount: number;
  serviceFee: number;
  finalAmount: number;
}): string => {
  const fmt = (n: number): string =>
    `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
  const startDateLine = data.startDate
    ? `<p style="margin:0 0 6px; line-height:1.6;"><strong>Departing:</strong> ${data.startDate}</p>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">Your trip is booked, ${data.userName}! ✈️</h2>
    <p style="margin:0 0 20px; line-height:1.6;">
      Thank you for booking with Ai Trip Planner. Your payment has been received and your itinerary is locked in.
    </p>

    <div style="background:rgba(140,50,50,0.08); border:1px solid rgba(140,50,50,0.4); padding:18px 20px; border-radius:8px; margin:0 0 24px;">
      <p style="margin:0 0 6px; font-size:11px; letter-spacing:0.15em; text-transform:uppercase; color:#8c3232;">
        Booking Reference
      </p>
      <p style="margin:0 0 14px; font-size:18px; font-weight:700; font-family:monospace;">
        ${data.bookingId}
      </p>
      <p style="margin:0 0 6px; line-height:1.6;"><strong>Trip:</strong> ${data.destination}</p>
      <p style="margin:0 0 6px; line-height:1.6;"><strong>From:</strong> ${data.origin}</p>
      <p style="margin:0 0 6px; line-height:1.6;"><strong>Duration:</strong> ${data.days} day${data.days === 1 ? '' : 's'}</p>
      ${startDateLine}
    </div>

    <h3 style="margin:0 0 12px; font-size:16px;">Payment Receipt</h3>
    <table style="width:100%; border-collapse:collapse; margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:14px;">Trip total</td>
        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:14px; text-align:right; font-family:monospace;">${fmt(data.baseAmount)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:14px;">Service fee</td>
        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:14px; text-align:right; font-family:monospace;">${fmt(data.serviceFee)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0; font-size:14px; font-weight:700; color:#8c3232;">Total paid</td>
        <td style="padding:12px 0 0; font-size:16px; font-weight:700; text-align:right; font-family:monospace; color:#8c3232;">${fmt(data.finalAmount)}</td>
      </tr>
    </table>

    <h3 style="margin:0 0 12px; font-size:16px;">What happens next</h3>
    <ul style="margin:0 0 24px; padding-left:20px; line-height:1.7;">
      <li>Our travel team will reach out within <strong>24 hours</strong> to confirm logistics — pickup time, hotel check-in, and any final preferences.</li>
      <li>Closer to your start date, we'll send a day-by-day reminder with weather and local advisories for your route.</li>
      <li>Need to make a change or have a question? Reply to this email or open a support ticket from your Ai Trip Planner dashboard.</li>
    </ul>

    <div style="text-align:center; margin:28px 0 20px;">
      <a href="${config.frontendUrl}/booking/${data.bookingId}/confirmed" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">View Receipt →</a>
    </div>

    <p style="margin:24px 0 0; line-height:1.6;">
      Thank you for choosing Ai Trip Planner for your Pakistan adventure.
    </p>
    <p style="margin:8px 0 0; line-height:1.6;">
      Safe travels,<br><strong>The Ai Trip Planner Team</strong>
    </p>
  `;

  return wrapEmailHtml({
    bodyHtml: body,
    preheader: `Booking confirmed — ${data.destination} (${data.bookingId})`,
  });
};

export const sendBookingConfirmedEmail = async (params: {
  userName: string;
  userEmail: string;
  bookingId: string;
  destination: string;
  origin: string;
  days: number;
  startDate: string | null;
  baseAmount: number;
  serviceFee: number;
  finalAmount: number;
}): Promise<boolean> => {
  const html = bookingConfirmedEmailHtml({
    userName: params.userName,
    bookingId: params.bookingId,
    destination: params.destination,
    origin: params.origin,
    days: params.days,
    startDate: params.startDate,
    baseAmount: params.baseAmount,
    serviceFee: params.serviceFee,
    finalAmount: params.finalAmount,
  });

  const text =
    `Booking ${params.bookingId} confirmed — your trip to ${params.destination} is booked.\n\n` +
    `Total paid: PKR ${Number(params.finalAmount || 0).toLocaleString('en-PK')}\n` +
    `Duration: ${params.days} day${params.days === 1 ? '' : 's'}\n` +
    (params.startDate ? `Departing: ${params.startDate}\n` : '') +
    `\nOur team will be in touch within 24 hours to coordinate logistics.\n\n` +
    `View your receipt: ${config.frontendUrl}/booking/${params.bookingId}/confirmed\n\n` +
    `Thank you for choosing Ai Trip Planner.`;

  return sendEmail({
    to: params.userEmail,
    subject: `Booking confirmed — your trip to ${params.destination} is locked in (${params.bookingId})`,
    text,
    html,
  });
};
// ─── Booking Cancellation / Refund ─────────────────────────────────────────
export const bookingCancelledEmailHtml = (data: {
  name: string;
  bookingId: string;
  destination: string;
  amount: number;
}): string => {
  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">Your booking has been cancelled</h2>
    <p style="margin:0 0 16px; line-height:1.6;">Hi ${data.name}, your booking <strong>${data.bookingId}</strong>${data.destination ? ` for <strong>${data.destination}</strong>` : ''} has been cancelled as requested.</p>
    <p style="margin:0 0 16px; line-height:1.6;">A refund of <strong>PKR ${Number(data.amount || 0).toLocaleString()}</strong> is being processed and will be returned to your original payment method. Refunds typically take 5 to 10 business days to appear.</p>
    <p style="margin:0 0 16px; line-height:1.6;">If you have any questions, reply to this email or reach us through the support page.</p>
    <p style="margin:20px 0 0; line-height:1.6;">— The Ai Trip Planner Team</p>
  `;
  return wrapEmailHtml({
    bodyHtml: body,
    preheader: 'Your Ai Trip Planner booking has been cancelled and a refund is being processed.',
  });
};

export const sendBookingCancelledEmail = async (params: {
  name: string;
  email: string;
  bookingId: string;
  destination?: string;
  amount?: number;
}): Promise<boolean> => {
  if (!params?.email) return false;
  const html = bookingCancelledEmailHtml({
    name: params.name || 'Traveller',
    bookingId: params.bookingId,
    destination: params.destination || '',
    amount: Number(params.amount || 0),
  });
  const text = `Your booking ${params.bookingId} has been cancelled. A refund of PKR ${Number(params.amount || 0).toLocaleString()} is being processed and typically takes 5 to 10 business days.`;
  return sendEmail({
    to: params.email,
    subject: `Your booking ${params.bookingId} has been cancelled`,
    text,
    html,
  });
};