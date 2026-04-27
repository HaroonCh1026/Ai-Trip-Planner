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
    console.log(`[stripe.service] Creating checkout session for user: ${userId}`);
    
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
  createProCheckoutSession, 
  getSubscription, 
  cancelStripeSubscription, 
  verifyWebhookSignature 
};