import mongoose, { Schema, Document } from 'mongoose';

// ─── AdminLog model (SDD §4.2) ──────────────────────────────────────────────
// Records every privileged action performed via the admin panel for auditing
// and compliance. Each log entry captures who did what, when, and on which
// target. Logs are append-only — there is intentionally no update or delete
// API exposed for them.

export type AdminAction =
  | 'user.block'
  | 'user.unblock'
  | 'user.delete'
  | 'blog.create'
  | 'blog.update'
  | 'blog.delete'
  | 'ticket.status'
  | 'ticket.reply';

export interface IAdminLog extends Document {
  action: AdminAction;
  // Admin who performed the action. Stored as a ref to User so we can populate
  // their name/email on read but never store stale denormalized data.
  performedBy: mongoose.Types.ObjectId;
  // Optional: the entity the action was performed on (user id, blog id, ticket id).
  // Stored as a string because the target type varies — we don't want a polymorphic ref.
  targetId?: string;
  // Optional: the collection name of the target ("users", "blogs", "supporttickets").
  targetType?: string;
  // Free-form human-readable summary, e.g. "Blocked freegpt1024@gmail.com" or
  // "Closed ticket #689e... after admin reply".
  details: string;
  // Mongoose adds createdAt/updatedAt automatically via timestamps option.
  createdAt: Date;
  updatedAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'user.block',
        'user.unblock',
        'user.delete',
        'blog.create',
        'blog.update',
        'blog.delete',
        'ticket.status',
        'ticket.reply',
      ],
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId:   { type: String, default: '' },
    targetType: { type: String, default: '' },
    details:    { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Common query: most recent logs first.
adminLogSchema.index({ createdAt: -1 });

const AdminLog = mongoose.model<IAdminLog>('AdminLog', adminLogSchema);
export default AdminLog;
