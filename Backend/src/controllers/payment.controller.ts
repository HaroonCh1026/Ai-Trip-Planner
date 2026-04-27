// Backend/src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import User from '../models/User';
import config from '../config/config';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import {
  createProCheckoutSession,
  verifyWebhookSignature,
  getSubscription,
} from '../services/stripe.service';

// ─── Create Checkout Session ───────────────────────────────────────────────
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
        const userId = session.metadata?.userId;
        
        console.log(`[payment] User ID from metadata: ${userId}`);
        
        if (userId) {
          // Set expiry to 30 days from now (simple and reliable)
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
          } else {
            console.error(`[payment] User not found: ${userId}`);
          }
        } else {
          console.error('[payment] No userId found in session metadata');
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