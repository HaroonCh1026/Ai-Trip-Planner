import AdminLog, { AdminAction } from '../models/AdminLog';

interface LogParams {
  action: AdminAction;
  performedBy: string;             // admin user id from req.user.id
  targetId?: string;
  targetType?: string;
  details: string;
}

/**
 * Write an admin audit log entry.
 *
 * Logging is best-effort: if the write fails (DB hiccup, validation error),
 * we log to console and continue. We never let an audit log failure break
 * the actual admin action.
 */
export const logAdminAction = async (params: LogParams): Promise<void> => {
  try {
    await AdminLog.create({
      action: params.action,
      performedBy: params.performedBy,
      targetId: params.targetId || '',
      targetType: params.targetType || '',
      details: params.details,
    });
  } catch (err) {
    // Don't throw — admin action should already be done by the time we log it.
    console.error('[AdminLog] Failed to write audit log:', err);
  }
};
