import { Response, NextFunction } from 'express';
import User from '../models/User';
import Trip from '../models/Trip';
import Booking from '../models/Booking';
import AdminLog from '../models/AdminLog';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { logAdminAction } from '../services/adminLog.service';
import { sendBookingCancelledEmail } from '../services/emailTemplates';

// ─── Cancel a paid booking (admin) ─────────────────────────────────────────
// Sets the booking to 'Cancelled' and notifies the traveller that a refund is
// being processed. Matched on the human-readable bookingId (BK-90XX), which is
// what the admin table already has. Email is best-effort and never blocks.
export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      sendError(res, 'Booking not found.', 404);
      return;
    }
    if (booking.status === 'Cancelled') {
      sendError(res, 'Booking is already cancelled.', 400);
      return;
    }

    booking.status = 'Cancelled';
    await booking.save();

    // Audit trail + best-effort cancellation/refund email to the traveller.
    logAdminAction({
      action: 'booking.cancel',
      performedBy: req.user!.id,
      targetId: booking.bookingId,
      targetType: 'bookings',
      details: `Cancelled booking ${booking.bookingId}`,
    }).catch(() => {});
    try {
      const user = await User.findById(booking.userId).select('name email');
      const snap = (booking.tripSnapshot || {}) as Record<string, unknown>;
      if (user?.email) {
        await sendBookingCancelledEmail({
          name: user.name || 'Traveller',
          email: user.email,
          bookingId: booking.bookingId || String(booking._id),
          destination: String(snap['destination'] || ''),
          amount: Number(booking.finalAmount || booking.amount || 0),
        });
      }
    } catch (e) {
      console.error('[admin] Booking cancellation email error (non-fatal):', e);
    }

    sendSuccess(
      res,
      { bookingId: booking.bookingId, status: booking.status },
      'Booking cancelled. The traveller has been notified and a refund is being processed.'
    );
  } catch (err) {
    next(err);
  }
};
import {
  getRawAdminConfigDoc,
  getEffectiveConfig,
  updateAdminConfig,
} from '../services/adminConfig.service';

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
export const getStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers, totalTrips, usersThisMonth, usersLastMonth,
      tripsThisMonth, tripsLastMonth, recentUsers,
      proUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Trip.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Trip.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Trip.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      // Round 3 (Admin #1): recentTrips removed — admin no longer sees individual user trips.
      // Aggregate trip counts (totals, monthly chart, regional distribution) remain
      // since those are anonymized system-health metrics, not per-user trip data.
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt plan'),
      User.countDocuments({ plan: 'pro' }),
    ]);

    // Revenue from paid bookings
    const revenueAgg = await Booking.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenue = revenueAgg[0]?.total || 0;

    // Real growth percentages (vs last month)
    const userGrowth = usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : usersThisMonth > 0 ? 100 : 0;
    const tripGrowth = tripsLastMonth > 0
      ? Math.round(((tripsThisMonth - tripsLastMonth) / tripsLastMonth) * 100)
      : tripsThisMonth > 0 ? 100 : 0;

    // Real regional activity from DB - top 6 destinations
    const regionalAgg = await Trip.aggregate([
      { $group: { _id: '$destination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);
    const regions = regionalAgg.map(r => ({ region: r._id, count: r.count }));

    // AI Calls = total trips (each trip = 1 Gemini API call)
    const aiCalls = totalTrips;

    // Monthly trip data for chart (last 12 months)
    const monthlyData: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = await Trip.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd } });
      monthlyData.push(count);
    }

    sendSuccess(res, {
      totalUsers,
      activeTrips: totalTrips,
      aiCalls,
      revenue: `PKR ${revenue.toLocaleString()}`,
      userGrowth,
      tripGrowth,
      proUsers,
      regions,
      monthlyData,
      recentUsers,
    });
  } catch (err) { next(err); }
};

export const getAllUsers = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Exclude admin accounts from user list (Issue #12)
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    const formatted = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: 'User',
      joined: new Date(u.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }),
      status: u.status,
      trips: u.tripsUsed,
      plan: u.plan,
    }));
    sendSuccess(res, { users: formatted, count: formatted.length });
  } catch (err) { next(err); }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!user) { sendError(res, 'User not found.', 404); return; }
    // Audit log
    await logAdminAction({
      action: req.body.status === 'Blocked' ? 'user.block' : 'user.unblock',
      performedBy: req.user!.id,
      targetId: req.params.id,
      targetType: 'users',
      details: `${req.body.status === 'Blocked' ? 'Blocked' : 'Unblocked'} user ${user.email}`,
    });
    sendSuccess(res, { user }, 'User status updated');
  } catch (err) { next(err); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { sendError(res, 'User not found.', 404); return; }
    await Trip.deleteMany({ userId: req.params.id });
    await Booking.deleteMany({ userId: req.params.id });
    // Audit log — capture email before it's gone since we already deleted the doc above.
    await logAdminAction({
      action: 'user.delete',
      performedBy: req.user!.id,
      targetId: req.params.id,
      targetType: 'users',
      details: `Deleted user ${user.email} and all associated trips/bookings`,
    });
    sendSuccess(res, null, 'User and associated data deleted');
  } catch (err) { next(err); }
};

// Round 3 (Admin #1): getAllTrips removed — admin no longer sees user trips.

export const getAllBookings = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 })
      .populate('userId', 'name email plan')
      .populate('tripId', 'destination origin days');
    const formatted = bookings.map((b) => {
      const u = b.userId as unknown as { name: string; email: string; plan: string };
      const t = b.tripId as unknown as { destination: string; origin: string; days: number };
      return {
        id: b.bookingId,
        user: u?.name || 'Unknown',
        userEmail: u?.email || '',
        userPlan: u?.plan || 'free',
        trip: t?.destination || 'Subscription Upgrade',
        origin: t?.origin || '—',
        days: t?.days || '—',
        date: new Date(b.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }),
        amount: `PKR ${b.amount.toLocaleString()}`,
        amountRaw: b.amount,
        status: b.status,
        planType: b.planType || '—',
      };
    });
    // Revenue stats
    const totalRevenue = bookings.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const paidCount = bookings.filter(b => b.status === 'Paid').length;
    sendSuccess(res, { bookings: formatted, count: formatted.length, totalRevenue, paidCount });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/logs ──────────────────────────────────────────────────
// Returns audit log entries, most recent first. Supports basic ?limit and
// ?action filters so the UI can paginate and filter without pulling everything.
export const getAdminLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const filter: Record<string, unknown> = {};
    if (req.query.action) filter['action'] = req.query.action;

    const logs = await AdminLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email');

    const formatted = logs.map((l) => {
      const admin = l.performedBy as unknown as { name?: string; email?: string };
      return {
        _id: l._id,
        action: l.action,
        adminName: admin?.name || 'Unknown',
        adminEmail: admin?.email || '',
        targetId: l.targetId,
        targetType: l.targetType,
        details: l.details,
        createdAt: l.createdAt,
      };
    });

    sendSuccess(res, { logs: formatted, count: formatted.length });
  } catch (err) { next(err); }
};

// ─── GET /api/admin/config ─────────────────────────────────────────────────
// Day 5A: returns the current operational config (service fee %, fuel price,
// vehicle/route overrides, free trip limit). Admin uses this to populate
// the pricing controls form.
//
// Returns BOTH the raw stored document (so admin sees what's actually saved)
// AND the effective merged config (which fills in defaults for unset fields).
// This way the form can pre-fill with effective values while the admin can
// still tell which fields were explicitly customised vs using defaults.
export const getConfig = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [raw, effective] = await Promise.all([
      getRawAdminConfigDoc(),
      getEffectiveConfig(),
    ]);
    sendSuccess(res, {
      raw, // null on first load before any save
      effective,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/admin/config ───────────────────────────────────────────────
// Day 5A: admin updates one or more pricing parameters. Partial update —
// any field omitted from the body is left unchanged.
//
// Validation:
//   - tripServiceFeePercent must be 0-50
//   - freeTripLimit must be 0-100
//   - fuelPricePerLiterPKR must be > 0
//   - vehicleOverridesPKR / flightRouteOverridesPKR must be plain {string: number} maps
//
// On success, invalidates the in-memory config cache so the next AI/booking
// request picks up the new values within milliseconds. Logs the change to
// AdminLog so we have an audit trail of pricing changes.
export const updateConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as {
      tripServiceFeePercent?: number;
      freeTripLimit?: number;
      fuelPricePerLiterPKR?: number;
      vehicleOverridesPKR?: Record<string, number>;
      flightRouteOverridesPKR?: Record<string, number>;
    };

    // ── Validate ──────────────────────────────────────────────────────────
    if (body.tripServiceFeePercent !== undefined) {
      const n = Number(body.tripServiceFeePercent);
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        sendError(res, 'tripServiceFeePercent must be a number between 0 and 50.', 400);
        return;
      }
    }
    if (body.freeTripLimit !== undefined) {
      const n = Number(body.freeTripLimit);
      if (!Number.isFinite(n) || n < 0 || n > 100 || !Number.isInteger(n)) {
        sendError(res, 'freeTripLimit must be a whole number between 0 and 100.', 400);
        return;
      }
    }
    if (body.fuelPricePerLiterPKR !== undefined) {
      const n = Number(body.fuelPricePerLiterPKR);
      if (!Number.isFinite(n) || n <= 0 || n > 10000) {
        sendError(res, 'fuelPricePerLiterPKR must be greater than 0 (PKR per litre).', 400);
        return;
      }
    }
    if (body.vehicleOverridesPKR !== undefined && (typeof body.vehicleOverridesPKR !== 'object' || Array.isArray(body.vehicleOverridesPKR))) {
      sendError(res, 'vehicleOverridesPKR must be an object map.', 400);
      return;
    }
    if (body.flightRouteOverridesPKR !== undefined && (typeof body.flightRouteOverridesPKR !== 'object' || Array.isArray(body.flightRouteOverridesPKR))) {
      sendError(res, 'flightRouteOverridesPKR must be an object map.', 400);
      return;
    }

    // ── Apply ─────────────────────────────────────────────────────────────
    const updated = await updateAdminConfig(body, req.user!.id);

    // ── Audit log ─────────────────────────────────────────────────────────
    // Capture which fields changed so the activity log is meaningful.
    const changedFields = Object.keys(body).filter((k) =>
      ['tripServiceFeePercent', 'freeTripLimit', 'fuelPricePerLiterPKR', 'vehicleOverridesPKR', 'flightRouteOverridesPKR'].includes(k)
    );
    const detailsLine =
      changedFields.length > 0
        ? `Updated pricing config: ${changedFields.join(', ')}`
        : 'Updated pricing config (no recognised fields)';
    await logAdminAction({
      action: 'admin.config.update',
      performedBy: req.user!.id,
      targetType: 'AdminConfig',
      targetId: 'default',
      details: detailsLine,
    });

    sendSuccess(res, { config: updated }, 'Configuration updated');
  } catch (err) {
    next(err);
  }
};