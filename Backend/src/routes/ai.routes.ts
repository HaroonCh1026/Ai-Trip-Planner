import { Router } from 'express';
import { generateItinerary } from '../controllers/ai.controller';
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

export default router;
