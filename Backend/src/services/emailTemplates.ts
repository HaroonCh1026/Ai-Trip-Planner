// Backend/src/services/emailTemplates.ts
import { wrapEmailHtml, sendEmail } from './email.service';
import config from '../config/config';

// ─── Welcome Email ─────────────────────────────────────────────────────────
export const welcomeEmailHtml = (name: string): string => {
  const body = `
    <h2 style="margin:0 0 16px; font-size:24px;">Welcome to VoyageurAI, ${name}! 🎉</h2>
    <p style="margin:0 0 16px; line-height:1.6;">We're thrilled to have you on board. Your AI-powered travel planning journey starts now.</p>
    <p style="margin:0 0 12px; font-weight:600;">With VoyageurAI, you can:</p>
    <ul style="margin:0 0 20px; padding-left:20px; line-height:1.6;">
      <li>✨ Generate personalized itineraries</li>
      <li>🌍 Discover hidden gems and local favorites</li>
      <li>💰 Get budget-optimized travel plans</li>
      <li>💬 Chat with our AI to refine your trips</li>
    </ul>
    <div style="text-align:center; margin:28px 0 20px;">
      <a href="${config.frontendUrl}/dashboard" style="display:inline-block; background:#8c3232; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600;">Plan Your First Trip →</a>
    </div>
    <p style="margin:20px 0 0; line-height:1.6;">Questions? Reply to this email — we're here to help!</p>
    <p style="margin:20px 0 0; line-height:1.6;">Safe travels,<br><strong>The VoyageurAI Team</strong></p>
  `;
  
  return wrapEmailHtml({ bodyHtml: body, preheader: 'Welcome to VoyageurAI - Start planning your next adventure!' });
};

export const sendWelcomeEmail = async (user: { name: string; email: string }): Promise<boolean> => {
  const html = welcomeEmailHtml(user.name);
  const text = `Welcome to VoyageurAI, ${user.name}! Start planning your AI-powered travel adventures today.`;
  
  return sendEmail({
    to: user.email,
    subject: 'Welcome to VoyageurAI',
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
    subject: 'VoyageurAI Support — Reply on your ticket',
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
  
  return wrapEmailHtml({ bodyHtml: body, preheader: 'Reset your VoyageurAI password' });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const html = passwordResetEmailHtml(resetToken);
  const text = `Reset your VoyageurAI password by clicking this link: ${config.frontendUrl}/reset-password/${resetToken}. This link expires in 1 hour.`;
  
  return sendEmail({
    to: email,
    subject: 'VoyageurAI - Password Reset Request',
    text,
    html,
  });
};