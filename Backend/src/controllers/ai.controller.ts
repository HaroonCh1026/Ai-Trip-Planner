import { Response, NextFunction } from 'express';
import { generateTripItinerary } from '../services/gemini.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest, TripGenerationInput } from '../types';
import User from '../models/User';
import config from '../config/config';

// ─── POST /api/ai/generate ─────────────────────────────────────────────────
// Gate: free users capped at FREE_TRIP_LIMIT (default 5). Pro users unlimited.
export const generateItinerary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // ── Fetch latest user state (not stale JWT data) ───────────────────────
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    // ── Enforce free tier trip limit ───────────────────────────────────────
    if (user.plan === 'free' && user.tripsUsed >= config.freeTripLimit) {
      sendError(
        res,
        `You have used all ${config.freeTripLimit} free trips. Please upgrade to Pro for unlimited trip generation.`,
        403
      );
      return;
    }

    const input: TripGenerationInput = req.body;
    const result = await generateTripItinerary(input);

    sendSuccess(res, result, 'Itinerary generated successfully');
  } catch (err) {
    const message = (err as Error).message;
    if (
      message.includes('Gemini') ||
      message.includes('invalid data') ||
      message.includes('malformed') ||
      message.includes('empty itinerary')
    ) {
      sendError(res, message, 502);
      return;
    }
    next(err);
  }
};
