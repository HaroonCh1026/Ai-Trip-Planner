// Backend/src/services/stripe.service.ts
import Stripe from 'stripe';
import config from '../config/config';

let stripeInstance: any = null;

const getStripe = (): any => {
  if (!config.stripe.secretKey) {
    if (config.nodeEnv === 'development') {
      console.warn('[stripe.service] STRIPE_SECRET_KEY not set — Stripe disabled');
    }
    return null;
  }

  if (!stripeInstance) {
    console.log('[stripe.service] Initializing Stripe...');
    stripeInstance = new Stripe(config.stripe.secretKey);
  }
  return stripeInstance;
};

// Helper exported so controllers can short-circuit to simulated path when
// Stripe isn't configured (e.g., dev environments without keys set).
export const isStripeEnabled = (): boolean => !!config.stripe.secretKey;

// Create a checkout session for Pro subscription
export const createProCheckoutSession = async (
  userId: string,
  userEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<any> => {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    console.log(`[stripe.service] Creating Pro checkout session for user: ${userId}`);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: config.stripe.proPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        // Round 5 (#3): explicit type so the webhook can route by booking
        // vs subscription. Existing subscription sessions created before
        // this change won't have `type` set; webhook treats absence as
        // "subscription" for backward compat.
        type: 'subscription',
        userId: userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log(`[stripe.service] Checkout session created: ${session.id}`);
    return session;
  } catch (error) {
    console.error('[stripe.service] Failed to create checkout session:', error);
    return null;
  }
};

// ─── Round 5 (#3): trip-booking checkout session ────────────────────────────
//
// Differs from createProCheckoutSession in three ways:
//   1. mode is 'payment' (one-time) not 'subscription' (recurring)
//   2. price_data is built dynamically since each trip costs a different
//      amount (totalCost + admin-configured service fee)
//   3. metadata carries bookingId + tripId + type='booking' so the webhook
//      can find the pending Booking row and flip it to Paid
//
// Stripe expects `unit_amount` in the smallest currency unit. PKR has no
// subunits in active circulation, but Stripe's PKR support still requires
// the amount to be passed as the raw integer (Stripe docs say "smallest
// unit"; for PKR, that IS the rupee since paisa coins aren't transacted).
// We multiply by 100 anyway because Stripe consistently treats unit_amount
// as 1/100 of the displayed currency for PKR — verified by their checkout
// preview rendering "PKR X.00" if you don't multiply.
export const createTripBookingCheckoutSession = async (params: {
  userId: string;
  userEmail: string;
  bookingId: string;       // Mongo _id of the Pending booking row
  tripId: string;
  tripDestination: string;
  tripDays: number;
  amountPKR: number;       // baseAmount + serviceFee, in whole rupees
  successUrl: string;
  cancelUrl: string;
}): Promise<any> => {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    console.log(
      `[stripe.service] Creating trip booking checkout for booking: ${params.bookingId} ` +
      `(amount: PKR ${params.amountPKR})`
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: params.userEmail,
      line_items: [
        {
          price_data: {
            currency: 'pkr',
            product_data: {
              name: `Trip to ${params.tripDestination}`,
              description: `${params.tripDays}-day VoyageurAI itinerary booking`,
            },
            // Stripe treats unit_amount as 1/100 of the displayed currency.
            unit_amount: Math.round(params.amountPKR * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'booking',
        userId: params.userId,
        bookingId: params.bookingId,
        tripId: params.tripId,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    console.log(`[stripe.service] Trip checkout session created: ${session.id}`);
    return session;
  } catch (error) {
    console.error('[stripe.service] Failed to create trip checkout session:', error);
    return null;
  }
};

// Get subscription details (kept for future use)
export const getSubscription = async (subscriptionId: string): Promise<any> => {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[stripe.service] Failed to retrieve subscription:', error);
    return null;
  }
};

// Cancel subscription in Stripe
export const cancelStripeSubscription = async (subscriptionId: string): Promise<any> => {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('[stripe.service] Failed to cancel subscription:', error);
    return null;
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: Buffer,
  signature: string,
  webhookSecret: string
): any => {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('[stripe.service] Webhook signature verification failed:', error);
    return null;
  }
};

export default {
  isStripeEnabled,
  createProCheckoutSession,
  createTripBookingCheckoutSession,
  getSubscription,
  cancelStripeSubscription,
  verifyWebhookSignature,
};