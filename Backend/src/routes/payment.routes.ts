// Backend/src/routes/payment.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createCheckoutSession,
  createTripCheckoutSession,
  getSubscriptionStatus,
  cancelSubscription,
} from '../controllers/payment.controller';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Create a Stripe checkout session for upgrading to Pro
router.post('/create-checkout-session', createCheckoutSession);

// Round 5 (#3): create a Stripe checkout session for booking a trip
router.post('/create-trip-checkout', createTripCheckoutSession);

// Get current user's subscription status
router.get('/subscription-status', getSubscriptionStatus);

// Cancel Pro subscription
router.post('/cancel-subscription', cancelSubscription);

export default router;