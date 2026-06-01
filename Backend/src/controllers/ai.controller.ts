import { Response, NextFunction } from 'express';
import { generateTripItinerary, generateInsiderInsights, applyVehicleOverrides } from '../services/gemini.service';
import { predictTripCost, buildMLInputFromTrip } from '../services/mlService';
import { validateItineraryFeasibility, FeasibilityReport } from '../utils/feasibilityValidator';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest, TripGenerationInput } from '../types';
import User from '../models/User';
import Trip from '../models/Trip';
import config from '../config/config';
import { getEffectiveConfig } from '../services/adminConfig.service';
import { getVehicle, computeTransportCost } from '../utils/vehicleOptions';
import { getRoute } from '../services/routingService';

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
    //
    // Group-size fix (post-Round 6): forward groupSize from the request body
    // so the ML model's `group_size` feature reflects reality (was defaulting
    // to 2 for everyone, which made solo trips inflated and family trips
    // under-priced from ML's perspective).
    const groupSizeNum = Math.max(
      1,
      Number((input as TripGenerationInput).groupSize) || 1
    );

    // Fetch the real road distance up front so the ML prediction reflects the
    // actual route instead of the old hard-coded 500 km default. Best-effort:
    // if routing is unavailable we pass undefined and buildMLInputFromTrip
    // falls back to its own default. We reuse this same lookup later for the
    // transport-cost redistribution, so this stays a single network call.
    const routeInfo = await getRoute(input.origin, input.destination).catch(() => null);
    const routeDistanceKm = routeInfo?.kmRoad;

    const mlInput = buildMLInputFromTrip({
      origin: input.origin,
      destination: input.destination,
      days: input.days,
      budget: input.budget,
      startDate: input.startDate,
      preferences: input.preferences,
      groupSize: groupSizeNum,
      distanceKm: routeDistanceKm,                         // real route distance (was defaulting to 500)
      vehicleId: (input as TripGenerationInput).vehicleId, // so transport mode affects the prediction
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

    // ─── Group-size floor removed (was: 'Layer B defensive ML scaling') ───
    // The old code multiplied the prediction up by a fixed per-group factor
    // (1.5x for a couple, 2.8x for a family of 4) on the theory that the
    // dataset had weak group-size signal. In practice the model scales for
    // group size on its own, and stacking this floor on top of a correctly
    // chosen accommodation tier was a major cause of the inflated totals
    // (a Mid couple trip being pushed past PKR 300k). With the tier fix in
    // mlService.guessAccommodationTier, the raw prediction is already
    // realistic, so we trust it directly. No artificial scaling.

    // ─── Budget overage cap (max PKR 30k over budget) ─────────────────────
    // The user is fine going up to PKR 30k over budget for a realistic plan,
    // but not more. We honour that by capping the cost target handed to Gemini
    // at (budget + 30k), so it never plans a trip beyond that ceiling. Because
    // the accommodation tier is already chosen from the budget, the realistic
    // cost normally sits near the budget and this cap rarely bites; it is the
    // guard rail for the cases where it would.
    const OVERAGE_CAP_PKR = 30000;
    const userBudgetPre = Number(input.budget) || 0;
    const maxSpendPKR = userBudgetPre > 0 ? userBudgetPre + OVERAGE_CAP_PKR : 0;

    // Inject the ML range into the input so gemini.service.ts can fold it
    // into the prompt. We put it on the input object rather than threading
    // a new parameter through the call signature — minimal API surface change.
    // The high/predicted values are capped at maxSpendPKR so Gemini's line
    // items naturally sum to something within the user's overage allowance.
    if (preflightPrediction) {
      const cap = maxSpendPKR > 0 ? maxSpendPKR : Number.MAX_SAFE_INTEGER;
      const cappedHigh = Math.min(preflightPrediction.high_pkr, cap);
      const cappedPredicted = Math.min(preflightPrediction.predicted_cost_pkr, cap);
      const cappedLow = Math.min(preflightPrediction.low_pkr, cappedHigh);
      (input as TripGenerationInput & {
        mlCostHint?: { low: number; high: number; predicted: number };
      }).mlCostHint = {
        low: cappedLow,
        high: cappedHigh,
        predicted: cappedPredicted,
      };
    }

    const result = await generateTripItinerary(input);

    // ── Hotel price normalization (post-Round 7 fix) ──────────────────────
    // Symptom: hotel.price comes back inconsistent — sometimes "PKR 10,111/
    // night", sometimes bare "20062", sometimes "PKR 81,079/night". Frontend
    // renders it verbatim, so different trips display the same field
    // differently. Daily reconciliation only normalized when its scaling
    // factor was non-1; in the common case where Gemini already hit the ML
    // target, no normalization ran.
    //
    // Fix: always normalize hotel.price to "PKR X,XXX/night" format right
    // after Gemini returns. Idempotent — re-running it on already-normalized
    // strings is safe (parser strips non-digits, formatter rebuilds).
    try {
      if (Array.isArray(result?.days)) {
        for (const day of result.days) {
          if (!day?.hotel || typeof day.hotel !== 'object') continue;
          const raw = (day.hotel as { price?: unknown; pricePerNight?: unknown }).price
                    ?? (day.hotel as { price?: unknown; pricePerNight?: unknown }).pricePerNight;
          if (raw == null || raw === '') continue;
          const num = Number(String(raw).replace(/[^\d]/g, ''));
          if (Number.isFinite(num) && num > 0) {
            (day.hotel as { price: string }).price = `PKR ${num.toLocaleString()}/night`;
          }
        }
      }
    } catch (hotelErr) {
      console.warn(
        '[ai.controller] Hotel price normalization failed:',
        (hotelErr as Error).message
      );
    }

    // ── Transport cost redistribution (post-Round 7 fix) ───────────────────
    // Symptom: every "<vehicle> (Private) Departure / Continues / towards X"
    // activity comes back from Gemini with cost: 0. Reason: the vehicle prompt
    // tells Gemini the round-trip transport cost as a single number, but
    // Gemini splits the journey into 4-9 sub-legs and doesn't know how to
    // distribute the lump sum. So it writes 0 on the legs and the daily
    // reconciliation later inflates meal costs to absorb the gap (PKR 13,757
    // for a roadside lunch, etc.).
    //
    // Fix: walk the itinerary, find every transit leg that names the user's
    // vehicle AND has cost 0, then distribute the round-trip transport cost
    // across them proportionally by duration (in hours). This way:
    //   - Long highway stretches carry more cost than short town segments
    //   - Total still equals the round-trip number Gemini was told to use
    //   - Meal/hotel costs stay realistic
    //   - The downstream reconciliation only handles small residual gaps
    //
    // No-op when: no vehicleId, no transit legs found, or every leg already
    // has a non-zero cost (Gemini got it right on its own).
    try {
      const vId = (input as TripGenerationInput).vehicleId;
      if (vId && Array.isArray(result?.days) && result.days.length > 0) {
        const seedVehicle = getVehicle(vId);
        if (seedVehicle) {
          const adminCfg = await getEffectiveConfig();
          const vehicle = applyVehicleOverrides(
            seedVehicle,
            adminCfg.vehicleOverridesPKR || {},
            adminCfg.flightRouteOverridesPKR || {}
          );
          // Reuse the route fetched up front for the ML input (one call, not two).
          const distance = routeInfo?.kmRoad ?? 500;
          const totalTransportCost = computeTransportCost({
            vehicle,
            distanceKm: distance * 2, // round-trip
            groupSize: groupSizeNum,
            routeKey: `${input.origin}-${input.destination}`.toLowerCase(),
            fuelPricePerLiterPKR: adminCfg.fuelPricePerLiterPKR,
          });

          // Step 1: collect every transit leg that mentions the vehicle label.
          // Match is case-insensitive and substring-based — handles "SUV
          // (Private) Departure from Lahore", "SUV (Private) Continues
          // Journey", etc. We also match the bare vehicle id as a fallback
          // (in case Gemini used a slightly different label).
          const labelLower = vehicle.label.toLowerCase();
          const idLower = vehicle.id.toLowerCase();

          // Bare-name fragments to also match (e.g. "SUV" alone, "Sedan" alone)
          // when Gemini drops the parenthetical "(Private)" suffix.
          // Pulled from the label by stripping " (...)" and lowercasing.
          const labelBare = vehicle.label.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();

          // Helper: parse "1.5 hours", "3 hours", "30 minutes", "Full Day"
          // to a numeric hour value. Returns 0 for "N/A" / unknown formats.
          const parseDurationHours = (raw: string): number => {
            if (!raw) return 0;
            const s = String(raw).toLowerCase().trim();
            if (s === 'n/a' || s === '') return 0;
            if (s.includes('full day')) return 8;
            const hourMatch = s.match(/([\d.]+)\s*hour/);
            if (hourMatch) return Number(hourMatch[1]) || 0;
            const minMatch = s.match(/([\d.]+)\s*min/);
            if (minMatch) return (Number(minMatch[1]) || 0) / 60;
            return 0;
          };

          // Transit-keyword set used by the fallback matcher. Gemini sometimes
          // drops the explicit vehicle name from the title (e.g. "Motorway
          // Travel towards Islamabad", "Continue Drive towards Chilas",
          // "Drive towards Skardu via Karakoram Highway"). Those are still
          // transit legs that should carry vehicle cost — we just can't see
          // the vehicle name to anchor on.
          //
          // To catch those without false-positives on sightseeing, we require
          // ALL of: cost === 0 + duration ≥ 2 hours + transit keyword in name.
          // 2-hour threshold keeps out "Brief Stop at Balakot" (30 min),
          // "Visit Skardu Bazaar" (2h sightseeing — but no transit keyword),
          // "Explore Kharpocho Fort" (2.5h hike — but no transit keyword).
          const TRANSIT_KEYWORDS = [
            'drive', 'driving',
            'travel', 'travelling', 'traveling',
            'journey',
            'depart', 'departure',
            'motorway',
            'highway',
            'kkh', 'karakoram',
            'route to',
            'enroute', 'en route',
            'towards',
            'via ',
            'transit',
          ];

          // Activity types that are EXPLICITLY non-transit. Even if the name
          // accidentally contains a transit keyword, skip these.
          const NON_TRANSIT_TYPES = new Set([
            'meal',
            'rest_stop',
            'arrival',
            'return_to_hotel',
            'check_in',
            'checkin',
            'hotel',
          ]);

          type TransitLeg = { day: any; activity: any; hours: number };
          const transitLegs: TransitLeg[] = [];

          // Standalone "round-trip transport cost" lump lines to remove, so
          // transport is counted once (on the per-leg shares below) and never
          // twice. Gemini tends to emit a lump line AND per-leg vehicle legs.
          const lumpLines: { day: any; activity: any }[] = [];
          const LUMP_TRANSPORT_RE =
            /round[\s-]?trip|transport(ation)?\s+cost|total\s+transport/;

          // Pre-compute which days already have a "Local 4x4 Jeep Rental" line.
          // On those days, the user is doing intra-destination off-road driving
          // in a rented jeep, NOT inter-city transport in their main vehicle.
          // So a transit-keyword leg on that same day (e.g. "Drive through
          // Deosai Plains") is the jeep tour, not a sedan leg — we must NOT
          // pile inter-city sedan cost onto it.
          //
          // The vehicle-NAME match still applies on jeep days though, because
          // some destinations split arrival across the jeep-day (e.g. final
          // hour of Sedan drive into Skardu on a day that also has an evening
          // jeep tour). Both can legitimately co-exist.
          const dayHasJeepRental = (day: any): boolean => {
            if (!Array.isArray(day?.activities)) return false;
            for (const a of day.activities) {
              const n = String(a?.name || '').toLowerCase();
              if (n.includes('local 4x4') || n.includes('local jeep') ||
                  (n.includes('jeep rental') && n.includes('local')) ||
                  n.includes('4x4 jeep rental')) {
                return true;
              }
            }
            return false;
          };

          for (const day of result.days) {
            if (!Array.isArray(day.activities)) continue;
            const isJeepDay = dayHasJeepRental(day);

            for (const activity of day.activities) {
              if (!activity || typeof activity.name !== 'string') continue;

              const nameLower = activity.name.toLowerCase();

              // Detect Gemini's standalone "round-trip transport cost" lump
              // line. Gemini is told to put the whole transport figure on one
              // line AND to name each driving leg with the vehicle, so it does
              // both, double-counting transport. We take ownership: record the
              // lump for removal and let the per-leg distribution below be the
              // single source of transport truth.
              if (LUMP_TRANSPORT_RE.test(nameLower)) {
                lumpLines.push({ day, activity });
                continue;
              }

              // Skip explicitly non-transit activity types (meals, rest stops,
              // arrivals, hotel check-ins).
              const typeLower = String(activity.type || '').toLowerCase();
              if (NON_TRANSIT_TYPES.has(typeLower)) continue;

              const hours = parseDurationHours(String(activity.duration || ''));
              if (hours <= 0) continue; // can't weight a 0-duration leg

              // NOTE: unlike before, we do NOT skip legs that already carry a
              // cost. Gemini's per-leg transport numbers are unreliable (it
              // lowballs them after dumping the real figure in the lump line),
              // so we OWN every matched transit leg and overwrite it below.

              // Primary match: vehicle label or id appears in the activity name.
              // (Reliable when Gemini follows the prompt's naming guidance.)
              const vehicleNameMatch =
                nameLower.includes(labelLower) ||
                nameLower.includes(idLower) ||
                (labelBare.length >= 3 && nameLower.includes(labelBare));

              // Fallback match: long-duration transit verb but no vehicle name.
              // Catches "Motorway Travel towards Islamabad", "Continue Drive
              // towards Chilas", "Drive towards Skardu via KKH". Requires
              // duration ≥ 2h to filter out "Stop at Balakot" (30min) and
              // local sightseeing activities.
              //
              // CRITICAL: on jeep-rental days, this fallback is DISABLED
              // because intra-destination off-road drives ("Drive through
              // Deosai Plains") would otherwise be wrongly classified as
              // inter-city transit. Vehicle-name match still applies — if
              // Gemini explicitly named the user's main vehicle on a jeep
              // day, it's a real inter-city leg.
              const hasTransitKeyword = TRANSIT_KEYWORDS.some((kw) =>
                nameLower.includes(kw)
              );
              const transitFallbackMatch =
                !isJeepDay && hasTransitKeyword && hours >= 2;

              if (!vehicleNameMatch && !transitFallbackMatch) continue;

              transitLegs.push({ day, activity, hours });
            }
          }

          // Step 2: distribute totalTransportCost across legs by hours.
          // Floor each share, give the rounding residual to the longest leg
          // so the sum lands exactly on totalTransportCost.
          if (transitLegs.length > 0 && totalTransportCost > 0) {
            const totalHours = transitLegs.reduce((s, l) => s + l.hours, 0);
            if (totalHours > 0) {
              let runningTotal = 0;
              // Sort once descending by hours so the residual lands on the
              // largest leg (most natural place to hide a few rupees).
              const sortedDesc = [...transitLegs].sort((a, b) => b.hours - a.hours);
              for (let i = 0; i < sortedDesc.length; i++) {
                const leg = sortedDesc[i];
                const isLast = i === sortedDesc.length - 1;
                const share = isLast
                  ? totalTransportCost - runningTotal
                  : Math.floor((leg.hours / totalHours) * totalTransportCost);
                leg.activity.cost = Math.max(0, share);
                runningTotal += share;
              }

              console.info(
                `[ai.controller] Transport cost redistributed for ${vehicle.label}: ` +
                `PKR ${totalTransportCost.toLocaleString()} across ${transitLegs.length} ` +
                `transit leg(s), totaling ${totalHours.toFixed(1)} hours.`
              );
            }
          }

          // ── Take ownership: remove lump lines, then rebuild totals ──────────
          // Remove every standalone lump transport line we recorded, so the
          // per-leg shares above are the only place transport is counted.
          for (const { day, activity } of lumpLines) {
            if (Array.isArray(day.activities)) {
              const idx = day.activities.indexOf(activity);
              if (idx >= 0) day.activities.splice(idx, 1);
            }
          }
          // Fallback: if there were no transit legs to carry the cost but a
          // lump existed, keep ONE corrected line rather than losing transport.
          if (transitLegs.length === 0 && lumpLines.length > 0 && totalTransportCost > 0) {
            const firstDay = result.days[0];
            if (firstDay && Array.isArray(firstDay.activities)) {
              firstDay.activities.unshift({
                time: '08:00',
                name: `Round-trip transport (${vehicle.label})`,
                location: `${input.origin} - ${input.destination}`,
                duration: 'N/A',
                cost: totalTransportCost,
                type: 'transport',
              });
            }
          }

          // Recompute each day's dailyCost from its visible line items (all
          // activity costs + the hotel) and the headline from the day totals.
          // This makes the figures bottom-up consistent and removes the
          // transport double-count that was baked into Gemini's headline.
          if (Array.isArray(result.days) && result.days.length > 0) {
            let newHeadline = 0;
            for (const day of result.days) {
              let daySum = 0;
              if (Array.isArray(day.activities)) {
                for (const a of day.activities) {
                  const v = Number((a as any)?.cost ?? (a as any)?.price ?? 0);
                  if (Number.isFinite(v) && v > 0) daySum += v;
                }
              }
              if (day?.hotel) {
                const hotel = day.hotel as any;
                let h = Number(hotel.price ?? hotel.pricePerNight ?? 0);
                if (!Number.isFinite(h) || h === 0) {
                  h = Number(
                    String(hotel.price ?? hotel.pricePerNight ?? '').replace(/[^\d]/g, '')
                  );
                }
                if (Number.isFinite(h) && h > 0) daySum += h;
              }
              (day as any).dailyCost = daySum;
              newHeadline += daySum;
            }
            (result as any).totalEstimatedCost = newHeadline;
            (result as any).totalCost = newHeadline;
          }
        }
      }
    } catch (transportErr) {
      // Non-fatal — if anything fails (route lookup, admin config, parsing),
      // fall back to the original behavior. The downstream reconciliation
      // block still runs and will scale meal costs to close the gap, same
      // as before this fix.
      console.warn(
        '[ai.controller] Transport cost redistribution failed:',
        (transportErr as Error).message
      );
    }

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

      // ─── Budget reconciliation: realistic-first, honest, and consistent ───
      // Rules:
      //   - The plan's cost is the REAL bottom-up sum of its line items.
      //   - Up to OVERAGE_CAP over budget is fine; we never pad a cheaper plan
      //     up, and never squeeze a costlier one down to a fake number.
      //   - If the real cost is MORE than OVERAGE_CAP over budget, the trip is
      //     genuinely unaffordable as specified: keep an honest figure (capped
      //     at the market ceiling) and let the itinerary say so and suggest
      //     changes, rather than pretend it fits.
      //   - Whenever we move the headline we scale the per-day totals AND every
      //     visible line item by the same factor, so the breakdown always adds
      //     up. (The old bug scaled day totals only, leaving line items intact,
      //     so a day header read 60k while its activities summed to 137k.)
      const userBudget = Number(input.budget) || 0;
      const realisticFloor = prediction.low_pkr;
      const realisticCeil = prediction.high_pkr;
      const maxSpend = userBudget > 0 ? userBudget + OVERAGE_CAP_PKR : realisticCeil;
      let costReconciled = false;
      let scaleFactor = 1;

      const applyHeadline = (reconciled: number) => {
        const factor = aiCost > 0 ? reconciled / aiCost : 1;
        scaleFactor = factor;
        (result as any).totalEstimatedCost = reconciled;
        (result as any).totalCost = reconciled;
        try {
          const days = Array.isArray(result?.days) ? result.days : [];
          let runningTotal = 0;
          for (let i = 0; i < days.length; i++) {
            const day: any = days[i];
            const isLast = i === days.length - 1;
            const currentDaily = Number(day.dailyCost) || 0;
            const newDaily = isLast
              ? reconciled - runningTotal
              : Math.round(currentDaily * factor);
            // Scale visible line items by the SAME factor so the per-day
            // breakdown keeps matching the day total.
            if (Array.isArray(day.activities)) {
              for (const a of day.activities) {
                if (typeof a.cost === 'number' && a.cost > 0) a.cost = Math.round(a.cost * factor);
                if (typeof a.price === 'number' && a.price > 0) a.price = Math.round(a.price * factor);
              }
            }
            if (day.hotel && typeof day.hotel === 'object') {
              if (typeof day.hotel.price === 'number' && day.hotel.price > 0) {
                day.hotel.price = Math.round(day.hotel.price * factor);
              }
              if (typeof day.hotel.pricePerNight === 'number' && day.hotel.pricePerNight > 0) {
                day.hotel.pricePerNight = Math.round(day.hotel.pricePerNight * factor);
              }
              if (typeof day.hotel.price === 'string') {
                const num = Number(String(day.hotel.price).replace(/[^\d]/g, ''));
                if (Number.isFinite(num) && num > 0) {
                  day.hotel.price = `PKR ${Math.round(num * factor).toLocaleString()}/night`;
                }
              }
            }
            day.dailyCost = newDaily;
            runningTotal += newDaily;
          }
        } catch {
          // Defensive: leave values unchanged on any error.
        }
        aiCost = reconciled;
        costReconciled = true;
      };

      // Affordability is judged on the REAL (pre-clamp) cost.
      const realCost = aiCost;
      const exceedsOverageCap =
        userBudget > 0 && realCost > userBudget + OVERAGE_CAP_PKR;

      if (realCost > 0) {
        if (exceedsOverageCap) {
          // Unaffordable as specified: keep an honest figure, only capping at
          // the market ceiling so we never claim more than such a trip costs.
          if (realCost > realisticCeil) applyHeadline(Math.round(realisticCeil));
        } else {
          // Affordable within the overage allowance: bound into the honest
          // band; never pad a cheap plan up.
          const upperBound = Math.max(realisticFloor, Math.min(realisticCeil, maxSpend));
          if (realCost < realisticFloor) applyHeadline(Math.round(realisticFloor));
          else if (realCost > upperBound) applyHeadline(Math.round(upperBound));
        }
      }
      withinRange = aiCost >= realisticFloor && aiCost <= realisticCeil;

      // Honest budget comparison off the FINAL headline.
      const overBudget = userBudget > 0 && aiCost > userBudget;
      const budgetShortfallPKR = overBudget ? Math.round(aiCost - userBudget) : 0;
      const underBudget = userBudget > 0 && aiCost < userBudget;
      const budgetSurplusPKR = underBudget ? Math.round(userBudget - aiCost) : 0;


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
        // Budget honesty signal. The frontend uses these to explain the
        // budget situation plainly in the itinerary: over budget (by how much),
        // under budget (savings), or right on target. budgetShortfallPKR is
        // capped at OVERAGE_CAP_PKR in normal cases; exceedsOverageCap flags
        // the rare trip that is unaffordable as specified even at its leanest.
        userBudgetPKR: userBudget,
        overBudget,
        budgetShortfallPKR,
        underBudget,
        budgetSurplusPKR,
        overageCapPKR: OVERAGE_CAP_PKR,
        exceedsOverageCap,
      } as typeof enriched.mlPrediction & {
        originalAiCostPKR: number;
        costReconciled: boolean;
        scaleFactor: number;
        userBudgetPKR: number;
        overBudget: boolean;
        budgetShortfallPKR: number;
        underBudget: boolean;
        budgetSurplusPKR: number;
        overageCapPKR: number;
        exceedsOverageCap: boolean;
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