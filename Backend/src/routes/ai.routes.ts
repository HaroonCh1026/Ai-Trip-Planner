import { Router } from 'express';
import { generateItinerary, refineItinerary, getInsiderInsights } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { generateTripSchema } from '../utils/validators';
import { arcjetAI } from '../middleware/arcjet.middleware';
import rateLimit from 'express-rate-limit';

// express-rate-limit as a secondary fallback (if Arcjet key not configured)
const aiExpressLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI generation limit reached (10/hr). Please try again later.',
  },
});

// Refinement is more lightweight than full generation but still hits Gemini.
// Allow more refines per hour than initial generations since pro users may
// iterate frequently on a single trip.
const refineLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Refinement limit reached (30/hr). Please try again later.',
  },
});

// Insights are cached on the trip after first generation, so most calls
// return instantly without hitting Gemini. Generous limit since the cache
// hits don't actually consume AI capacity.
const insightsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Insights request limit reached (60/hr). Please try again later.',
  },
});

const router = Router();

// POST /api/ai/generate — requires login, Arcjet token bucket + fallback limiter
router.post(
  '/generate',
  authenticate,
  arcjetAI,
  aiExpressLimiter,
  validate(generateTripSchema),
  generateItinerary
);

// POST /api/ai/refine — Pro-only; trip refinement via natural language
router.post(
  '/refine',
  authenticate,
  arcjetAI,
  refineLimiter,
  refineItinerary
);

// POST /api/ai/insights/:tripId — Pro-only; AI-generated local insider tips.
// First call hits Gemini (~10s), subsequent calls return cached tips instantly.
router.post(
  '/insights/:tripId',
  authenticate,
  insightsLimiter,
  getInsiderInsights
);

export default router;