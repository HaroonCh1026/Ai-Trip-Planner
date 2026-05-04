import { Response, NextFunction } from 'express';
import { generateTripItinerary, generateInsiderInsights } from '../services/gemini.service';
import { predictTripCost, buildMLInputFromTrip } from '../services/mlService';
import { validateItineraryFeasibility, FeasibilityReport } from '../utils/feasibilityValidator';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest, TripGenerationInput } from '../types';
import User from '../models/User';
import Trip from '../models/Trip';
import config from '../config/config';
import { getEffectiveConfig } from '../services/adminConfig.service';

// ─── POST /api/ai/generate ─────────────────────────────────────────────────
// Gate: free users capped at FREE_TRIP_LIMIT (default 5). Pro users unlimited.
//
// Day 2: After Gemini returns an itinerary, we ALSO call our trained
// cost-prediction model to validate Gemini's claimed total cost. The result
// is attached to the response under `mlPrediction` so the frontend can show
// "based on similar trips, expected cost: PKR X – Y" on the review screen.
//
// IMPORTANT: ML enrichment is best-effort — if the Python service is offline
// or any prediction call fails, we still return Gemini's itinerary normally
// (without the mlPrediction field). The frontend treats absence as "we
// don't know, just trust the AI estimate."
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
    // Day 5A: limit is now read live from AdminConfig (admin-editable). Falls
    // back to env-based config.freeTripLimit if AdminConfig is unreachable.
    const cfg = await getEffectiveConfig();
    const effectiveFreeLimit = cfg.freeTripLimit ?? config.freeTripLimit;
    if (user.plan === 'free' && user.tripsUsed >= effectiveFreeLimit) {
      sendError(
        res,
        `You have used all ${effectiveFreeLimit} free trips. Please upgrade to Pro for unlimited trip generation.`,
        403
      );
      return;
    }

    const input: TripGenerationInput = req.body;

    // ─── Round 2 (Option B): ML-grounded cost generation ──────────────────
    // We now predict the realistic cost range FIRST, then pass it to Gemini
    // as a prompt constraint. This produces natural-looking line items that
    // sum to a defensible total — instead of generating freely and scaling
    // numbers afterward.
    //
    // Flow:
    //   1. ML predicts [low, high] range from request fields (no Gemini needed yet)
    //   2. We pass the range to gemini.service via input.mlCostHint
    //   3. Gemini generates with line items anchored to that range
    //   4. ML re-validates the output (should now naturally fit)
    //   5. If Gemini still drifts (rare), we apply a gentle TOTAL-only fallback
    //
    // ML being unavailable is fine — generation falls back to old behaviour.
    const mlInput = buildMLInputFromTrip({
      origin: input.origin,
      destination: input.destination,
      days: input.days,
      budget: input.budget,
      startDate: input.startDate,
      preferences: input.preferences,
    });

    let preflightPrediction: Awaited<ReturnType<typeof predictTripCost>> = null;
    if (mlInput) {
      try {
        preflightPrediction = await predictTripCost(mlInput);
      } catch {
        // ML service down — generate without the constraint. App stays alive.
        preflightPrediction = null;
      }
    }

    // Inject the ML range into the input so gemini.service.ts can fold it
    // into the prompt. We put it on the input object rather than threading
    // a new parameter through the call signature — minimal API surface change.
    if (preflightPrediction) {
      (input as TripGenerationInput & {
        mlCostHint?: { low: number; high: number; predicted: number };
      }).mlCostHint = {
        low: preflightPrediction.low_pkr,
        high: preflightPrediction.high_pkr,
        predicted: preflightPrediction.predicted_cost_pkr,
      };
    }

    const result = await generateTripItinerary(input);

    // ── Round 2 (Option 2): Daily cost reconciliation ──────────────────────
    // Forces TWO consistencies:
    //   (a) sum of all dailyCost === totalEstimatedCost  (the headline math)
    //   (b) sum of activities + hotel inside each day === that day's dailyCost
    //       (the per-day breakdown math)
    //
    // Without (b), the user sees Day 1: PKR 42k header but only PKR 12k of
    // visible expenses inside — a 30k gap. With (b), we scale the activities
    // and hotel prices by the same factor we applied to the day total, so
    // every visible number matches.
    //
    // This DOES change activity/hotel price values, but only proportionally
    // within each day. A bus that was PKR 5,000 becomes PKR 14,000 in a day
    // scaled 2.8x — defensible (premium Daewoo + airport tax) and still
    // human-readable, unlike Round 1's earlier global 4x scale.
    try {
      const headline = Number(result?.totalEstimatedCost ?? 0);
      const days = Array.isArray(result?.days) ? result.days : [];

      // Helper: scale every numeric cost inside a day by `factor`.
      // Used both when redistributing the headline AND when activities/hotel
      // need to be brought up to match the day total.
      const scaleDayInternals = (day: any, factor: number) => {
        if (!day || factor === 1 || !Number.isFinite(factor)) return;
        if (Array.isArray(day.activities)) {
          for (const a of day.activities) {
            if (typeof a.cost === 'number' && a.cost > 0) {
              a.cost = Math.round(a.cost * factor);
            }
            if (typeof a.price === 'number' && a.price > 0) {
              a.price = Math.round(a.price * factor);
            }
          }
        }
        if (day.hotel && typeof day.hotel === 'object') {
          if (typeof day.hotel.price === 'number' && day.hotel.price > 0) {
            day.hotel.price = Math.round(day.hotel.price * factor);
          }
          if (typeof day.hotel.pricePerNight === 'number' && day.hotel.pricePerNight > 0) {
            day.hotel.pricePerNight = Math.round(day.hotel.pricePerNight * factor);
          }
          // Some Gemini outputs use string prices like "PKR 8,000/night"
          if (typeof day.hotel.price === 'string') {
            const num = Number(String(day.hotel.price).replace(/[^\d]/g, ''));
            if (Number.isFinite(num) && num > 0) {
              const scaled = Math.round(num * factor);
              day.hotel.price = `PKR ${scaled.toLocaleString()}/night`;
            }
          }
        }
      };

      // Helper: parse day's existing internal sum (activities + hotel)
      const computeDayInternalSum = (day: any): number => {
        let sum = 0;
        if (Array.isArray(day?.activities)) {
          for (const a of day.activities) {
            const v = Number(a?.cost ?? a?.price ?? 0);
            if (Number.isFinite(v)) sum += v;
          }
        }
        if (day?.hotel) {
          let h = Number(day.hotel.price ?? day.hotel.pricePerNight ?? 0);
          if (!Number.isFinite(h) || h === 0) {
            // Fall back to parsing string price
            const raw = String(day.hotel.price ?? day.hotel.pricePerNight ?? '');
            h = Number(raw.replace(/[^\d]/g, ''));
          }
          if (Number.isFinite(h)) sum += h;
        }
        return sum;
      };

      if (headline > 0 && days.length > 0) {
        // Step 1: get current dailyCost values
        const dayCosts: number[] = days.map((d: any) => {
          const raw = d.dailyCost ?? d.estimatedCost ?? 0;
          const n = typeof raw === 'string'
            ? Number(String(raw).replace(/[^\d]/g, ''))
            : Number(raw);
          return Number.isFinite(n) && n > 0 ? n : 0;
        });
        const dailySum = dayCosts.reduce((s, n) => s + n, 0);

        // Step 2: distribute headline across days (Stage A)
        const newDailyCosts: number[] = [];
        if (dailySum > 0 && Math.abs(dailySum - headline) / headline > 0.02) {
          const scale = headline / dailySum;
          let runningTotal = 0;
          for (let i = 0; i < days.length; i++) {
            const isLast = i === days.length - 1;
            const adjusted = isLast
              ? headline - runningTotal
              : Math.round(dayCosts[i] * scale);
            newDailyCosts.push(adjusted);
            runningTotal += adjusted;
          }
        } else if (dailySum === 0) {
          // Gemini omitted dailyCost entirely — distribute headline equally
          const each = Math.floor(headline / days.length);
          let runningTotal = 0;
          for (let i = 0; i < days.length; i++) {
            const isLast = i === days.length - 1;
            const adjusted = isLast ? headline - runningTotal : each;
            newDailyCosts.push(adjusted);
            runningTotal += adjusted;
          }
        } else {
          // Already within tolerance — keep existing values
          for (const v of dayCosts) newDailyCosts.push(v);
        }

        // Step 3: write the new day totals AND scale internals (Stage B)
        // For each day, find the gap between (activities + hotel) and the
        // new day total, then scale internals by that ratio.
        for (let i = 0; i < days.length; i++) {
          const newTotal = newDailyCosts[i];
          (days[i] as any).dailyCost = newTotal;

          const internalSum = computeDayInternalSum(days[i]);
          if (internalSum > 0 && newTotal > 0) {
            // Scale each activity/hotel price so internals roughly match newTotal.
            // Threshold: only intervene if gap >15%. With the richer prompt
            // (5-8 activities per day, all 3 meals, transport, hotel), Gemini
            // naturally produces sums close to dailyCost. Small natural rounding
            // (under 15%) is left as-is rather than artificially scaled.
            if (Math.abs(internalSum - newTotal) / newTotal > 0.15) {
              const internalScale = newTotal / internalSum;
              scaleDayInternals(days[i], internalScale);
            }
          }
        }
      }
    } catch (rebalanceErr) {
      // If anything goes wrong in rebalancing, leave the response as-is.
      // Better to show a slightly inconsistent breakdown than crash.
      console.warn('[ai.controller] Daily cost rebalance failed:', (rebalanceErr as Error).message);
    }

    // ── Day 2: Validate Gemini's output against ML prediction ──────────────
    // After Gemini generates with the range hint, we still verify alignment.
    // In the common case Gemini respected the range and we just attach the
    // metadata. In the edge case it ignored the hint, we apply a gentler
    // total-only reconciliation (no per-line-item scaling — those are
    // Gemini's natural numbers and should be preserved).
    let aiCost = Number(result?.totalEstimatedCost ?? 0);

    type EnrichedItineraryResponse = typeof result & {
      mlPrediction?: {
        predictedCostPKR: number;
        lowPKR: number;
        highPKR: number;
        rmsePKR: number;
        aiEstimatePKR: number;
        deltaPercent: number;
        withinRange: boolean;
        confidenceLabel: 'accurate' | 'slightly_off' | 'unrealistic';
        predictedAt: Date;
      };
      // Day 3: feasibility report from the validator. Optional — if validation
      // fails internally we omit rather than blocking the user from getting
      // their itinerary.
      feasibility?: FeasibilityReport;
    };
    const enriched: EnrichedItineraryResponse = result;

    // Reuse the preflight prediction we ran BEFORE Gemini. No second call needed.
    if (preflightPrediction) {
      const prediction = preflightPrediction;
      const predicted = prediction.predicted_cost_pkr;
      const originalAiCost = aiCost;
      let withinRange =
        aiCost >= prediction.low_pkr && aiCost <= prediction.high_pkr;

      // ─── Round 2 (Option B): gentle total-only fallback ──────────────────
      // The new architecture (passing the ML range as a Gemini prompt
      // constraint) means Gemini SHOULD produce realistic line items
      // summing to the target range. So in the common case `withinRange`
      // is already true here and we just attach metadata.
      //
      // For the rare case Gemini ignores the constraint, we apply a
      // total-only adjustment — we no longer scale individual line items
      // because that produced unrealistic numbers like "PKR 27,322 day
      // trip" in the user's screenshot. The line items remain whatever
      // Gemini chose; only the headline total gets aligned to the ML
      // midpoint, and we surface this in the cost panel.
      let costReconciled = false;
      let scaleFactor = 1;
      if (!withinRange && aiCost > 0 && predicted > 0) {
        const target = (prediction.low_pkr + prediction.high_pkr) / 2;
        scaleFactor = target / aiCost;
        costReconciled = true;

        const reconciled = Math.round(target);
        (result as any).totalEstimatedCost = reconciled;
        (result as any).totalCost = reconciled;
        aiCost = reconciled;
        withinRange = true; // by construction

        // NOTE: deliberately NOT scaling per-day cost / activity prices /
        // hotel prices. Those were produced by Gemini under the prompt
        // constraint (or, if that failed, are at least Gemini's natural
        // estimates which look human-readable). Touching them produced
        // weird numbers like "PKR 27,322 lunch" in the previous round.

        // Round 2: but DO re-rebalance daily costs so they sum to the new
        // total. We rescale dailyCost values by the same factor — this
        // doesn't touch individual activity/hotel prices (which stay
        // realistic) but keeps the per-day breakdown aligned with the
        // new headline.
        try {
          const days = Array.isArray(result?.days) ? result.days : [];
          if (days.length > 0) {
            let runningTotal = 0;
            for (let i = 0; i < days.length; i++) {
              const isLast = i === days.length - 1;
              const current = Number((days[i] as any).dailyCost) || 0;
              const adjusted = isLast
                ? reconciled - runningTotal
                : Math.round(current * scaleFactor);
              (days[i] as any).dailyCost = adjusted;
              runningTotal += adjusted;
            }
          }
        } catch {
          // Defensive: leave unchanged if anything goes wrong
        }
      }

      // Recompute delta against the (potentially-aligned) total
      const delta = predicted > 0
        ? Math.round(((aiCost - predicted) / predicted) * 100)
        : 0;
      const absDelta = Math.abs(delta);
      const confidenceLabel: 'accurate' | 'slightly_off' | 'unrealistic' =
        absDelta <= 15 ? 'accurate' : absDelta <= 30 ? 'slightly_off' : 'unrealistic';

      enriched.mlPrediction = {
        predictedCostPKR: predicted,
        lowPKR: prediction.low_pkr,
        highPKR: prediction.high_pkr,
        rmsePKR: prediction.rmse_pkr,
        aiEstimatePKR: aiCost,
        deltaPercent: delta,
        withinRange,
        confidenceLabel,
        predictedAt: new Date(),
        originalAiCostPKR: originalAiCost,
        costReconciled,
        scaleFactor: Math.round(scaleFactor * 1000) / 1000,
      } as typeof enriched.mlPrediction & {
        originalAiCostPKR: number;
        costReconciled: boolean;
        scaleFactor: number;
      };
    }

    // ── Day 3: Run feasibility validator ───────────────────────────────────
    // Walk the AI-generated itinerary and check whether the day-by-day timing
    // is physically possible given real Pakistani distances. Validator is
    // best-effort — if anything goes wrong internally, we skip silently
    // rather than blocking the user from seeing their itinerary. The frontend
    // renders the warnings panel only if `feasibility.violations` is non-empty.
    try {
      if (Array.isArray(result.days) && result.days.length > 0) {
        const report = await validateItineraryFeasibility(result.days);
        // Only attach if there's something actionable — keeps the response
        // payload minimal for the common "no issues" case.
        if (report.violations.length > 0) {
          enriched.feasibility = report;
        }
      }
    } catch (feasErr) {
      // Logged but non-fatal. Trip generation still succeeds.
      console.warn('[ai.controller] Feasibility validation failed:', (feasErr as Error).message);
    }

    sendSuccess(res, enriched, 'Itinerary generated successfully');
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

// ─── /api/ai/refine endpoint removed in Round 3 (issue #2). ──────────────


// ─── POST /api/ai/insights/:tripId ─────────────────────────────────────────
// Day 4 Msg 2: Insider Insights. Pro-only.
//
// Flow:
//   1. Verify user is Pro (free users → 403)
//   2. Load trip + verify ownership
//   3. If trip already has cached insiderInsights for the SAME destination,
//      return them immediately (no Gemini call). This is the common path
//      after the first generation — instant load, no cost.
//   4. Otherwise call Gemini with the insights prompt
//   5. Persist the result on the Trip document (markModified for Mixed type)
//   6. Return the insights
//
// Destination freshness check: trip.destination === insiderInsights.destination
// is a cheap guard kept as defensive hygiene — the destination can no longer
// change after a trip is generated, but the check is harmless.
export const getInsiderInsights = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params as { tripId?: string };

    if (!tripId || typeof tripId !== 'string') {
      sendError(res, 'tripId is required.', 400);
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
        'Insider Insights is a Pro feature. Upgrade to unlock local tips, hidden gems, and cultural notes.',
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

    // ── Cache hit? ────────────────────────────────────────────────────────
    // Fast-path: if we've already generated insights for this destination on
    // this trip, return them instantly.
    const cached = trip.insiderInsights as
      | { destination?: string; tips?: unknown[]; generatedAt?: Date }
      | undefined;
    const cacheValid =
      cached &&
      Array.isArray(cached.tips) &&
      cached.tips.length > 0 &&
      cached.destination === trip.destination;

    if (cacheValid) {
      sendSuccess(res, { insights: cached, cached: true }, 'Insider insights loaded');
      return;
    }

    // ── Cache miss → call Gemini ───────────────────────────────────────────
    // Pull a few activity names from the existing itinerary so Gemini's tips
    // complement (rather than duplicate) what's already planned. Take from
    // multiple days so highlights span the trip.
    const itineraryHighlights: string[] = [];
    if (Array.isArray(trip.itinerary)) {
      for (const day of trip.itinerary) {
        if (Array.isArray(day.activities)) {
          for (const act of day.activities) {
            if (act?.name && itineraryHighlights.length < 6) {
              itineraryHighlights.push(act.name);
            }
          }
        }
      }
    }

    const result = await generateInsiderInsights({
      destination: trip.destination,
      origin: trip.origin,
      days: trip.days,
      startDate: trip.startDate,
      itineraryHighlights,
    });

    // ── Persist to trip ────────────────────────────────────────────────────
    const insights = {
      destination: result.destination,
      tips: result.tips,
      generatedAt: new Date(),
    };
    // Mongoose Mixed type requires markModified to detect the change.
    (trip as unknown as { insiderInsights: unknown }).insiderInsights = insights;
    trip.markModified('insiderInsights');
    await trip.save();

    sendSuccess(res, { insights, cached: false }, 'Insider insights generated');
  } catch (err) {
    const message = (err as Error).message;
    if (
      message.includes('Gemini') ||
      message.includes('malformed') ||
      message.includes('no insights') ||
      message.includes('no usable insights')
    ) {
      sendError(res, message, 502);
      return;
    }
    next(err);
  }
};