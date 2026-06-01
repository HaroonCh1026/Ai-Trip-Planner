// Backend/src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Trip from '../models/Trip';
import Booking from '../models/Booking';
import config from '../config/config';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import {
  createProCheckoutSession,
  createTripBookingCheckoutSession,
  verifyWebhookSignature,
  isStripeEnabled,
} from '../services/stripe.service';
import { getEffectiveConfig } from '../services/adminConfig.service';
import { sendBookingConfirmedEmail, sendProUpgradeEmail } from '../services/emailTemplates';

const DEFAULT_TRIP_SERVICE_FEE_PERCENT = 8;

// ─── Create Pro Subscription Checkout Session ──────────────────────────────
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Don't allow if already Pro
    if (user.plan === 'pro') {
      sendError(res, 'Already on Pro plan', 400);
      return;
    }

    const successUrl = config.stripe.successUrl;
    const cancelUrl = config.stripe.cancelUrl;

    const session = await createProCheckoutSession(
      userId,
      user.email,
      successUrl,
      cancelUrl
    );

    if (!session) {
      sendError(res, 'Failed to create checkout session', 500);
      return;
    }

    sendSuccess(res, { sessionId: session.id, url: session.url }, 'Checkout session created');
  } catch (error) {
    console.error('[payment] Create checkout session error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

// ─── Round 5 (#3): Create Trip Booking Checkout Session ────────────────────
//
// Flow:
//   1. Verify trip exists and belongs to the user
//   2. Compute baseAmount + serviceFee (live from AdminConfig)
//   3. Pre-create a Booking row with status='Pending' and a tripSnapshot
//   4. Create a Stripe Checkout session in 'payment' mode for that amount,
//      with metadata.type='booking' and metadata.bookingId pointing at the
//      Pending row
//   5. Return the Stripe Checkout URL to the client; frontend redirects
//
// On payment success, the webhook handler flips the booking from
// Pending → Paid using metadata.bookingId. On payment cancel, the booking
// stays as Pending and is harmless — the user can retry, which creates
// a fresh Pending row (we don't reuse old ones to keep the audit trail
// clean).
//
// If Stripe isn't configured (STRIPE_SECRET_KEY empty), we return 503 so
// the frontend can fall back to the simulated booking path.
export const createTripCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!isStripeEnabled()) {
      sendError(res, 'Stripe payment is not configured on this server', 503);
      return;
    }

    const { tripId } = req.body;
    if (!tripId) {
      sendError(res, 'tripId is required', 400);
      return;
    }

    const [user, trip] = await Promise.all([
      User.findById(userId),
      Trip.findOne({ _id: tripId, userId }),
    ]);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    const baseAmount =
      Number(trip.totalCost) > 0 ? Number(trip.totalCost) : Number(trip.budget) || 0;
    if (baseAmount <= 0) {
      sendError(res, 'This trip has no cost set; cannot create booking.', 400);
      return;
    }

    const cfg = await getEffectiveConfig();
    const feePercent = cfg.tripServiceFeePercent ?? DEFAULT_TRIP_SERVICE_FEE_PERCENT;
    const serviceFee = Math.round(baseAmount * (feePercent / 100));
    const finalAmount = baseAmount + serviceFee;

    // Snapshot trip details onto the Booking so the receipt page survives
    // even if the Trip is deleted/refined later.
    const tripSnapshot = {
      destination: trip.destination,
      origin: trip.origin,
      days: trip.days,
      startDate: trip.startDate,
      dates: trip.dates,
      image: trip.image,
      totalCost: trip.totalCost,
    };

    // Pre-create the booking row in Pending state. Webhook flips to Paid.
    const booking = await Booking.create({
      userId,
      tripId,
      amount: finalAmount,
      status: 'Pending',
      bookingType: 'trip',
      baseAmount,
      serviceFee,
      finalAmount,
      tripSnapshot,
    });

    // Build Stripe success/cancel URLs that route to OUR confirmation page.
    // We append the bookingId so PaymentSuccess can fetch + render the
    // booking receipt (instead of the Pro-upgrade copy it uses today).
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl =
      `${frontendUrl}/payment/success?type=booking&bookingId=${booking._id}` +
      `&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${frontendUrl}/payment/cancel?type=booking&bookingId=${booking._id}`;

    const session = await createTripBookingCheckoutSession({
      userId,
      userEmail: user.email,
      bookingId: String(booking._id),
      tripId: String(trip._id),
      tripDestination: trip.destination || 'Pakistan trip',
      tripDays: Number(trip.days) || 0,
      amountPKR: finalAmount,
      successUrl,
      cancelUrl,
    });

    if (!session) {
      // Roll back the pending booking — Stripe failed and we don't want
      // an orphan Pending row sitting in the user's bookings list.
      await Booking.deleteOne({ _id: booking._id });
      sendError(res, 'Failed to create Stripe checkout session', 500);
      return;
    }

    sendSuccess(
      res,
      {
        sessionId: session.id,
        url: session.url,
        bookingId: booking._id,
        feePercent,
      },
      'Trip checkout session created'
    );
  } catch (error) {
    console.error('[payment] Create trip checkout session error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

// ─── Get Subscription Status ───────────────────────────────────────────────
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await User.findById(userId).select('+planExpires');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Check if pro has expired
    let isPro = user.plan === 'pro';
    let planExpires = user.planExpires;

    if (isPro && planExpires && new Date(planExpires) < new Date()) {
      // Expired - downgrade
      user.plan = 'free';
      user.planExpires = null;
      await user.save();
      isPro = false;
      planExpires = null;
      console.log(`[payment] Downgraded expired pro user: ${user.email}`);
    }

    sendSuccess(res, {
      plan: isPro ? 'pro' : 'free',
      expiresAt: planExpires,
    });
  } catch (error) {
    console.error('[payment] Get subscription status error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

// ─── Cancel Subscription ───────────────────────────────────────────────────
export const cancelSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.plan !== 'pro') {
      sendError(res, 'Not on Pro plan', 400);
      return;
    }

    // Downgrade user to free
    user.plan = 'free';
    user.planExpires = null;
    await user.save();

    console.log(`[payment] Cancelled Pro subscription for user: ${user.email}`);
    sendSuccess(res, null, 'Subscription cancelled successfully');
  } catch (error) {
    console.error('[payment] Cancel subscription error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

// ─── Handle Stripe Webhook ─────────────────────────────────────────────────
// POST /api/payments/webhook (raw body - handled in app.ts)
//
// Round 5 (#3): now routes by metadata.type:
//   • 'booking'      → flip the pending Booking row from Pending → Paid
//   • 'subscription' → upgrade the user's plan to Pro, set planExpires
//   • undefined      → backward-compat: assume subscription (older Pro
//                       checkout sessions created before metadata.type was
//                       added)
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = config.stripe.webhookSecret;

    console.log('[payment] Webhook received');
    console.log('[payment] Signature present:', !!signature);
    console.log('[payment] Webhook secret configured:', !!webhookSecret);

    if (!webhookSecret) {
      console.warn('[payment] Webhook secret not configured');
      res.status(400).json({ success: false, message: 'Webhook secret missing' });
      return;
    }

    const event = verifyWebhookSignature(req.body, signature, webhookSecret);

    if (!event) {
      console.error('[payment] Invalid webhook signature');
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    console.log(`[payment] Received webhook event: ${event.type}`);

    // Only process checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('[payment] Processing checkout.session.completed');

      try {
        const session = event.data.object;
        const meta = session.metadata || {};
        const userId = meta.userId;
        const sessionType = meta.type || 'subscription'; // backward compat

        console.log(`[payment] Session type: ${sessionType}, userId: ${userId}`);

        if (!userId) {
          console.error('[payment] No userId in session metadata — skipping');
          res.json({ success: true, received: true });
          return;
        }

        // ── Branch 1: trip booking ─────────────────────────────────────
        if (sessionType === 'booking') {
          const bookingId = meta.bookingId;
          if (!bookingId) {
            console.error('[payment] booking session missing bookingId in metadata');
            res.json({ success: true, received: true });
            return;
          }

          const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, userId },
            { status: 'Paid' },
            { new: true }
          );

          if (updated) {
            console.log(
              `[payment] ✅ SUCCESS: Booking ${bookingId} marked as Paid ` +
              `(BK ID: ${updated.bookingId}, amount: PKR ${updated.finalAmount})`
            );

            // Round 5b: send confirmation email to user.
            // Best-effort — if email fails (SMTP not configured / blip),
            // we log but DON'T fail the webhook. Stripe must always get a
            // 200 back so it doesn't retry the charge.
            try {
              const user = await User.findById(userId).select('name email');
              const snap: any = updated.tripSnapshot || {};
              if (user?.email) {
                const emailSent = await sendBookingConfirmedEmail({
                  userName: user.name || 'Traveller',
                  userEmail: user.email,
                  bookingId: updated.bookingId || String(updated._id),
                  destination: snap.destination || 'Pakistan',
                  origin: snap.origin || '—',
                  days: Number(snap.days) || 0,
                  startDate: snap.startDate || null,
                  baseAmount: Number(updated.baseAmount || 0),
                  serviceFee: Number(updated.serviceFee || 0),
                  finalAmount: Number(updated.finalAmount || updated.amount || 0),
                });
                if (emailSent) {
                  console.log(
                    `[payment] Booking confirmation email sent to ${user.email}`
                  );
                } else {
                  console.warn(
                    `[payment] Booking confirmation email NOT sent — SMTP may not be configured. ` +
                    `Booking is paid; user just won't get the email receipt.`
                  );
                }
              }
            } catch (emailErr) {
              console.error(
                '[payment] Booking confirmation email error (non-fatal):',
                emailErr
              );
            }
          } else {
            console.error(
              `[payment] Booking ${bookingId} not found for user ${userId} — ` +
              `webhook ran but could not flip status. Check that the row exists ` +
              `and belongs to the right user.`
            );
          }

          res.json({ success: true, received: true });
          return;
        }

        // ── Branch 2: Pro subscription (existing behavior, preserved) ──
        // sessionType === 'subscription' or absent (legacy)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        console.log(`[payment] Setting Pro expiry to: ${expiryDate}`);

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            plan: 'pro',
            planExpires: expiryDate,
          },
          { new: true }
        );

        if (updatedUser) {
          console.log(`[payment] ✅ SUCCESS: User ${userId} upgraded to Pro`);
          console.log(`[payment] User plan is now: ${updatedUser.plan}`);
          console.log(`[payment] Expires on: ${updatedUser.planExpires}`);

          // Best-effort Pro confirmation email. Never fail the webhook over it
          // (Stripe must always get a 200 so it doesn't retry the charge).
          if (updatedUser.email) {
            sendProUpgradeEmail({
              name: updatedUser.name || 'Traveller',
              email: updatedUser.email,
            }).catch((e) =>
              console.error('[payment] Pro upgrade email error (non-fatal):', e)
            );
          }
        } else {
          console.error(`[payment] User not found: ${userId}`);
        }
      } catch (innerError) {
        console.error('[payment] Error processing checkout completion:', innerError);
      }
    } else {
      // Ignore other event types
      console.log(`[payment] Ignoring event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('[payment] Webhook top-level error:', error);
    res.status(500).json({ success: false, message: 'Webhook handler failed', error: String(error) });
  }
};