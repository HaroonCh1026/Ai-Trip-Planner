import { Response, NextFunction } from 'express';
import User from '../models/User';
import Trip from '../models/Trip';
import Booking from '../models/Booking';
import AdminLog from '../models/AdminLog';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { logAdminAction } from '../services/adminLog.service';

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
export const getStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers, totalTrips, usersThisMonth, usersLastMonth,
      tripsThisMonth, tripsLastMonth, recentTrips, recentUsers,
      proUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Trip.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Trip.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Trip.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Trip.find().sort({ createdAt: -1 }).limit(5).select('destination origin days createdAt status userId'),
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
      recentTrips,
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

export const getAllTrips = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Issue #11: removed .select('-itinerary') — admin needs full itinerary
    const trips = await Trip.find().sort({ createdAt: -1 }).populate('userId', 'name email');
    sendSuccess(res, { trips, count: trips.length });
  } catch (err) { next(err); }
};

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
