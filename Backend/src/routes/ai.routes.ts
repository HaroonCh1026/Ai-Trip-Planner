import { Router } from 'express';
import { generateItinerary, refineItinerary } from '../controllers/ai.controller';
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

export default router;