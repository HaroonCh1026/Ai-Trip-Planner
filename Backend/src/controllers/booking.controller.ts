import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Trip from '../models/Trip';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { getEffectiveConfig } from '../services/adminConfig.service';
import { sendProUpgradeEmail } from '../services/emailTemplates';

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

// ─── POST /api/bookings/trip — Day 4: Trip booking simulation ─────────────
// Books the user's saved trip with a transparent 8% service fee added on top.
// This is a SIMULATED booking (no real money changes hands, no real partner
// API calls). It exists to demonstrate the platform's revenue model: every
// booking generates `serviceFee` revenue for the company.
//
// The fee percentage is currently hard-coded at 8% but will be admin-editable
// from the AdminConfig collection in Day 5. Storing serviceFee on each
// booking row (rather than re-computing) means historical revenue stays
// accurate even if the admin later changes the fee percentage.
//
// On success, returns the saved Booking document. The frontend uses
// the booking._id to route to /booking/:id/confirmed.
//
// Day 5A: the fee % is now read live from AdminConfig (admin-editable).
// We still persist the fee VALUE on each Booking row, so historical revenue
// stays accurate even if the admin changes the % later. The constant below
// is only the seed default used when AdminConfig is unreachable.
const DEFAULT_TRIP_SERVICE_FEE_PERCENT = 8;

export const bookTrip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tripId } = req.body;
    const userId = req.user!.id;

    if (!tripId) {
      sendError(res, 'tripId is required.', 400);
      return;
    }

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      sendError(res, 'Trip not found.', 404);
      return;
    }

    // Use the trip's totalCost as the base. If it's 0/missing (shouldn't
    // happen but defensive), fall back to the user's budget.
    const baseAmount = Number(trip.totalCost) > 0 ? Number(trip.totalCost) : Number(trip.budget) || 0;
    if (baseAmount <= 0) {
      sendError(res, 'This trip has no cost set; cannot create booking.', 400);
      return;
    }

    // Read effective service fee % from AdminConfig (cached, falls back to
    // default if config doc absent or Mongo read fails).
    const cfg = await getEffectiveConfig();
    const feePercent = cfg.tripServiceFeePercent ?? DEFAULT_TRIP_SERVICE_FEE_PERCENT;

    const serviceFee = Math.round(baseAmount * (feePercent / 100));
    const finalAmount = baseAmount + serviceFee;

    // Snapshot the trip's headline fields so the booking confirmation page
    // doesn't depend on the Trip document still existing.
    const tripSnapshot = {
      destination: trip.destination,
      origin: trip.origin,
      days: trip.days,
      startDate: trip.startDate,
      dates: trip.dates,
      image: trip.image,
      totalCost: trip.totalCost,
    };

    const booking = await Booking.create({
      userId,
      tripId,
      amount: finalAmount,             // backward-compat: amount = total
      status: 'Paid',                  // simulated: instantly "paid"
      bookingType: 'trip',
      baseAmount,
      serviceFee,
      finalAmount,
      tripSnapshot,
      // Optional fields if the trip captured them:
      vehicleId: undefined,            // populated when we wire vehicle to trip persistence
      groupSize: undefined,
    });

    sendSuccess(
      res,
      {
        booking,
        servicefeePercent: feePercent,
      },
      'Trip booked successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id — Day 4: fetch single booking for confirmation ──
// The frontend hits this on /booking/:id/confirmed to render a receipt.
// Scoped to the requesting user — no booking sharing across users.
export const getBookingById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id, userId });
    if (!booking) {
      sendError(res, 'Booking not found.', 404);
      return;
    }
    sendSuccess(res, { booking });
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

    // Best-effort Pro confirmation email (same as the Stripe webhook path).
    if (user.email) {
      sendProUpgradeEmail({ name: user.name || 'Traveller', email: user.email }).catch(
        () => {}
      );
    }

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