import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Trip from '../models/Trip';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

// ─── POST /api/bookings ────────────────────────────────────────────────────
export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tripId, amount } = req.body;
    const userId = req.user!.id;

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) { sendError(res, 'Trip not found.', 404); return; }

    const booking = await Booking.create({ userId, tripId, amount, status: 'Pending' });
    sendSuccess(res, { booking }, 'Booking created', 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings ─────────────────────────────────────────────────────
export const getUserBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate('tripId', 'destination origin days startDate');

    sendSuccess(res, { bookings, count: bookings.length });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/bookings/upgrade ────────────────────────────────────────────
// Stripe TEST MODE subscription upgrade (FR-5)
// Test card: 4242 4242 4242 4242 → always succeeds
// Test card: 4000 0000 0000 0002 → always declines
export const upgradeSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan, testCardNumber } = req.body;
    const userId = req.user!.id;

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      sendError(res, 'Invalid plan. Must be "monthly" or "annual".', 400);
      return;
    }

    // Stripe test card simulation
    const cardLast4 = (testCardNumber || '').replace(/\s/g, '').slice(-4);
    const DECLINE_CARDS = ['0002', '0341', '9995', '9235'];

    if (DECLINE_CARDS.includes(cardLast4)) {
      sendError(
        res,
        cardLast4 === '9995'
          ? 'Your card has insufficient funds. Please use a different card.'
          : 'Your card was declined. Please use a different payment method.',
        402
      );
      return;
    }

    const planConfig: Record<string, { amount: number; label: string }> = {
      monthly: { amount: 2500,  label: 'Monthly' },
      annual:  { amount: 25000, label: 'Annual'  },
    };
    const { amount, label } = planConfig[plan];

    // Update user plan in MongoDB
    const user = await User.findByIdAndUpdate(
      userId,
      { plan: 'pro' },
      { new: true }
    );
    if (!user) { sendError(res, 'User not found.', 404); return; }

    // Record subscription as a Paid booking (no tripId for subscription records)
    const fakeObjectId = new mongoose.Types.ObjectId();
    const booking = await Booking.create({
      userId,
      tripId: fakeObjectId,
      amount,
      status: 'Paid',
      planType: label,
    });

    sendSuccess(
      res,
      {
        plan: 'pro',
        bookingId: booking.bookingId,
        amount,
        currency: 'PKR',
      },
      `VoyageurAI Pro (${label}) activated successfully!`
    );
  } catch (err) {
    next(err);
  }
};
