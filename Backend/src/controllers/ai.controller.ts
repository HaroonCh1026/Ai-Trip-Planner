import { Response, NextFunction } from 'express';
import { generateTripItinerary, refineTripItinerary } from '../services/gemini.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest, TripGenerationInput } from '../types';
import User from '../models/User';
import Trip from '../models/Trip';
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

// ─── POST /api/ai/refine ───────────────────────────────────────────────────
// Round 7: conversational refinement. Pro-only feature.
//
// Flow:
//   1. Verify user is Pro (free users get 403 with upgrade prompt)
//   2. Load trip + verify ownership
//   3. Call Gemini refine with current itinerary + user instruction
//   4. Replace trip's active itinerary with the new one
//   5. Append the previous itinerary to refinements history (so user can
//      see what changed). The instruction is stored alongside the snapshot.
//   6. Return the updated trip
export const refineItinerary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { tripId, instruction } = req.body as { tripId?: string; instruction?: string };

    // ── Input validation ───────────────────────────────────────────────────
    if (!tripId || typeof tripId !== 'string') {
      sendError(res, 'tripId is required.', 400);
      return;
    }
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      sendError(res, 'instruction is required.', 400);
      return;
    }
    if (instruction.length > 500) {
      sendError(res, 'Instruction is too long (max 500 characters).', 400);
      return;
    }

    // ── Pro-only gate ──────────────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    if (user.plan !== 'pro') {
      sendError(
        res,
        'Itinerary refinement is a Pro feature. Upgrade to refine your trips with AI.',
        403
      );
      return;
    }

    // ── Load trip + ownership check ────────────────────────────────────────
    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
      sendError(res, 'Trip not found.', 404);
      return;
    }
    if (!trip.itinerary || trip.itinerary.length === 0) {
      sendError(res, 'This trip has no itinerary to refine yet.', 400);
      return;
    }

    // ── Build the snapshot we'll send to Gemini (current visible state) ────
    const currentItinerary = {
      summary: trip.summary,
      totalEstimatedCost: trip.totalCost,
      days: trip.itinerary,
      tips: trip.tips,
      bestTimeToVisit: trip.bestTimeToVisit,
      currency: trip.currency,
      language: trip.language,
      emergencyNumbers: trip.emergencyNumbers || '',
    };

    // ── Call Gemini ────────────────────────────────────────────────────────
    const refined = await refineTripItinerary({
      origin: trip.origin,
      destination: trip.destination,
      days: trip.days,
      budget: trip.budget,
      startDate: trip.startDate,
      currentItinerary,
      instruction: instruction.trim(),
    });

    // ── Append previous version to history BEFORE overwriting ──────────────
    // We store the instruction alongside the OLD snapshot so the history reads
    // as "you asked X, and at that time the itinerary looked like this."
    trip.refinements.push({
      instruction: instruction.trim(),
      itinerarySnapshot: currentItinerary,
      summary: trip.summary,
      totalCost: trip.totalCost,
      createdAt: new Date(),
    });

    // ── Replace active itinerary fields with refined version ───────────────
    // IMPORTANT: when we reassign nested array fields like `itinerary` and
    // `tips`, Mongoose's change tracking sometimes misses it because the
    // assignment swaps the array reference but each nested sub-document
    // still looks "untouched" to Mongoose's diff. We call markModified()
    // explicitly to guarantee these fields are persisted on save().
    trip.itinerary = refined.days as unknown as typeof trip.itinerary;
    trip.summary = refined.summary || trip.summary;
    trip.totalCost = refined.totalEstimatedCost || trip.totalCost;
    trip.tips = refined.tips || trip.tips;
    trip.bestTimeToVisit = refined.bestTimeToVisit || trip.bestTimeToVisit;
    if (refined.currency) trip.currency = refined.currency;
    if (refined.language) trip.language = refined.language;
    if (refined.emergencyNumbers) trip.emergencyNumbers = refined.emergencyNumbers;

    trip.markModified('itinerary');
    trip.markModified('tips');
    trip.markModified('refinements');

    await trip.save();

    sendSuccess(res, { trip }, 'Itinerary refined successfully');
  } catch (err) {
    const message = (err as Error).message;
    if (
      message.includes('Gemini') ||
      message.includes('malformed') ||
      message.includes('empty itinerary')
    ) {
      sendError(res, message, 502);
      return;
    }
    next(err);
  }
};