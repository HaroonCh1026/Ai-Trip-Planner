import { Response, NextFunction } from 'express';
import Trip from '../models/Trip';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

// ─── POST /api/trips ───────────────────────────────────────────────────────
export const createTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Ensure tripsUsed exists for Google/social auth users
    const user = await User.findById(userId);
    if (user && (user.tripsUsed === undefined || user.tripsUsed === null)) {
      await User.findByIdAndUpdate(userId, { tripsUsed: 0, plan: 'free' });
    }

    const trip = await Trip.create({ userId, ...req.body });

    // Increment tripsUsed atomically
    await User.findByIdAndUpdate(userId, { $inc: { tripsUsed: 1 } });

    sendSuccess(res, { trip }, 'Trip saved successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/trips ────────────────────────────────────────────────────────
export const getUserTrips = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const trips = await Trip.find({ userId })
      .sort({ createdAt: -1 })
      .select('-itinerary');

    sendSuccess(res, { trips, count: trips.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/trips/:id ────────────────────────────────────────────────────
export const getTripById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user!.id,
    });
    if (!trip) { sendError(res, 'Trip not found.', 404); return; }
    sendSuccess(res, { trip });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/trips/:id/status ──────────────────────────────────────────
export const updateTripStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const allowed = ['upcoming', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      sendError(res, `Status must be one of: ${allowed.join(', ')}`, 400);
      return;
    }
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { status },
      { new: true }
    );
    if (!trip) { sendError(res, 'Trip not found.', 404); return; }
    sendSuccess(res, { trip }, `Trip marked as ${status}`);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/trips/:id ─────────────────────────────────────────────────
export const deleteTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.id,
    });
    if (!trip) { sendError(res, 'Trip not found.', 404); return; }
    sendSuccess(res, null, 'Trip deleted successfully');
  } catch (err) {
    next(err);
  }
};
