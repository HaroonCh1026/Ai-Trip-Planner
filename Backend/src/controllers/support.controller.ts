import { Request, Response, NextFunction } from 'express';
import SupportTicket from '../models/SupportTicket';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { logAdminAction } from '../services/adminLog.service';
import {
  sendNewTicketAdminEmail,
  sendUserReplyAdminEmail,
  sendAdminReplyUserEmail,
} from '../services/emailTemplates';

export const createTicket = async (req: Request | AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, category, message } = req.body;
    const userId = (req as AuthRequest).user?.id || null;
    const ticket = await SupportTicket.create({
      userId, name, email,
      category: category || 'General Inquiry',
      message,
      messages: [{ sender: 'user', senderName: name, text: message, createdAt: new Date() }],
    });
    // Fire-and-forget: notify admin a new ticket landed.
    sendNewTicketAdminEmail({
      _id: ticket._id,
      name: ticket.name,
      email: ticket.email,
      category: ticket.category,
      message: ticket.message,
    }).catch(() => undefined);
    sendSuccess(res, { ticket }, 'Your message has been received. We will get back to you shortly.', 201);
  } catch (err) { next(err); }
};

export const getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user!.id }).sort({ updatedAt: -1 });
    sendSuccess(res, { tickets, count: tickets.length });
  } catch (err) { next(err); }
};

// GET /api/support/:id — user fetches a single ticket they own (for deep-link refresh)
export const getMyTicketById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!ticket) { sendError(res, 'Ticket not found.', 404); return; }
    sendSuccess(res, { ticket });
  } catch (err) { next(err); }
};

export const getAllTickets = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets = await SupportTicket.find().sort({ updatedAt: -1 }).populate('userId', 'name email');
    sendSuccess(res, { tickets, count: tickets.length });
  } catch (err) { next(err); }
};

export const updateTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: Record<string, unknown> = {};
    if (req.body.status) updates['status'] = req.body.status;
    if (req.body.adminReply !== undefined) updates['adminReply'] = req.body.adminReply;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!ticket) { sendError(res, 'Ticket not found.', 404); return; }
    // Audit log — describe what changed.
    const changes: string[] = [];
    if (req.body.status) changes.push(`status → ${req.body.status}`);
    if (req.body.adminReply !== undefined) changes.push('admin reply updated');
    await logAdminAction({
      action: 'ticket.status',
      performedBy: req.user!.id,
      targetId: ticket._id.toString(),
      targetType: 'supporttickets',
      details: `Updated ticket from ${ticket.email} (${changes.join(', ') || 'no changes'})`,
    });
    sendSuccess(res, { ticket }, 'Ticket updated');
  } catch (err) { next(err); }
};

// POST /api/admin/support/:id/message — admin adds message to thread
export const addTicketMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, sender, senderName } = req.body;
    if (!text?.trim()) { sendError(res, 'Message text is required.', 400); return; }
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        $push: { messages: { sender: sender || 'admin', senderName: senderName || 'Support Team', text, createdAt: new Date() } },
        ...(sender === 'admin' ? { status: 'In Progress', adminReply: text } : {}),
      },
      { new: true }
    );
    if (!ticket) { sendError(res, 'Ticket not found.', 404); return; }
    // Audit log — only log when an admin actually sent the message.
    if (sender !== 'user') {
      const previewText = text.length > 80 ? text.slice(0, 80) + '…' : text;
      await logAdminAction({
        action: 'ticket.reply',
        performedBy: req.user!.id,
        targetId: ticket._id.toString(),
        targetType: 'supporttickets',
        details: `Replied to ticket from ${ticket.email}: "${previewText}"`,
      });
      // Fire-and-forget: notify the user that admin replied.
      sendAdminReplyUserEmail(
        {
          _id: ticket._id,
          name: ticket.name,
          email: ticket.email,
          category: ticket.category,
          message: ticket.message,
        },
        text
      ).catch(() => undefined);
    }
    sendSuccess(res, { ticket }, 'Message sent');
  } catch (err) { next(err); }
};

// POST /api/support/:id/message — user adds message to their ticket
export const addUserMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text?.trim()) { sendError(res, 'Message text is required.', 400); return; }
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!ticket) { sendError(res, 'Ticket not found.', 404); return; }
    ticket.messages.push({ sender: 'user', senderName: ticket.name, text, createdAt: new Date() });
    if (ticket.status === 'Closed') ticket.status = 'Open';
    await ticket.save();
    // Fire-and-forget: notify admin that user replied.
    sendUserReplyAdminEmail(
      {
        _id: ticket._id,
        name: ticket.name,
        email: ticket.email,
        category: ticket.category,
        message: ticket.message,
      },
      text
    ).catch(() => undefined);
    sendSuccess(res, { ticket }, 'Message sent');
  } catch (err) { next(err); }
};