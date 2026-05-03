import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config';
import { TripGenerationInput, GeminiItineraryResponse } from '../types';

// ─── Singleton client ──────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// ─── Build the exact same prompt used in frontend config.js ───────────────
import { buildTravelConstraintsPrompt } from '../utils/feasibilityValidator';
import { getVehicle, computeTransportCost, computeFuelCost, VehicleOption } from '../utils/vehicleOptions';
import { getRoute } from './routingService';
import { getEffectiveConfig } from './adminConfig.service';

// ─── Day 5A: apply admin pricing overrides to a seed vehicle ───────────────
// We never mutate the shared catalog object — clone first, then patch
// costPerKmPKR and (for flights) merged route prices. Missing overrides
// just fall through to the seed defaults.
function applyVehicleOverrides(
  seed: VehicleOption,
  vehicleOverrides: Record<string, number>,
  flightRouteOverrides: Record<string, number>
): VehicleOption {
  const override = vehicleOverrides[seed.id];
  const cost = typeof override === 'number' && override > 0 ? override : seed.costPerKmPKR;

  // For flights, also merge admin route price overrides on top of seed
  // routes. Admin can add new routes here too — keys not in seed are kept.
  let mergedRoutes = seed.fixedRoutePricesPKR;
  if (seed.fixedRoutePricesPKR && Object.keys(flightRouteOverrides).length > 0) {
    mergedRoutes = { ...seed.fixedRoutePricesPKR };
    for (const [k, v] of Object.entries(flightRouteOverrides)) {
      if (typeof v === 'number' && v > 0) {
        mergedRoutes[k.toLowerCase()] = v;
      }
    }
  }

  return {
    ...seed,
    costPerKmPKR: cost,
    fixedRoutePricesPKR: mergedRoutes,
  };
}

const buildPrompt = async (input: TripGenerationInput): Promise<string> => {
  const days = Number(input.days);
  const budget = Number(input.budget);
  const preferences = input.preferences || 'Architecture, Culture, Logistics';
  const groupSize = Math.max(1, Number(input.groupSize) || 1);

  // ── Day 5A: pull current effective ops config ───────────────────────────
  // Used to apply admin-edited overrides (vehicle costs, flight prices, fuel
  // price) without redeploy. Cached, fast.
  const adminCfg = await getEffectiveConfig();

  // ── Day 3: build the travel-constraints block ─────────────────────────
  // Looks up real distance & drive time for this origin→destination pair
  // and tells Gemini what's realistic. If neither Geoapify nor curated nor
  // dataset has data, this returns null and we silently skip the constraint
  // injection (Gemini falls back to its own knowledge).
  let constraintsBlock = '';
  try {
    const constraints = await buildTravelConstraintsPrompt(input.origin, input.destination);
    if (constraints) {
      constraintsBlock = `\n${constraints}\n`;
    }
  } catch {
    // Routing service failure is never fatal — drop the constraints block silently.
  }

  // ── Day 4 fix: build the vehicle/transport context block ────────────
  // The prompt now does THREE things differently:
  //   1. Vehicle choice changes ACTIVITIES, not just the price tag.
  //      Private vehicles unlock scenic detours; public transport keeps
  //      itineraries city-to-city; flights compress travel into a single
  //      block leaving more time at the destination.
  //   2. If no vehicleId is supplied, we still inject a sensible default
  //      ("intercity bus / shared van") so Gemini gets consistent guidance.
  //   3. The transport cost is computed and fed in, with explicit instruction
  //      to use exactly that number — Gemini was previously free to invent
  //      its own.
  //
  // Day 5A: vehicle.costPerKmPKR and flight route prices are admin-overridable.
  // We clone the seed vehicle and patch overrides on top so existing helpers
  // still work without changing their signatures.
  let vehicleBlock = '';
  let vehicleStyleGuidance = '';
  const seedVehicle = input.vehicleId ? getVehicle(input.vehicleId) : undefined;
  const route = await getRoute(input.origin, input.destination).catch(() => null);
  const distance = route?.kmRoad ?? 500;

  // Apply admin overrides to the seed vehicle (if any). We never mutate the
  // shared catalog — clone first.
  const vehicle = seedVehicle
    ? applyVehicleOverrides(seedVehicle, adminCfg.vehicleOverridesPKR, adminCfg.flightRouteOverridesPKR)
    : undefined;

  if (vehicle) {
    const roundTripCost = computeTransportCost({
      vehicle,
      distanceKm: distance * 2,
      groupSize,
      routeKey: `${input.origin}-${input.destination}`.toLowerCase(),
    });

    // Vehicle-class style rules — these change the SHAPE of the itinerary,
    // not just the cost. Categorized into 4 patterns and selected by id.
    const id = vehicle.id;
    if (id === 'flight_economy') {
      vehicleStyleGuidance =
        'TRAVEL PATTERN: Treat the journey to the destination as a single ' +
        'block (transit to airport, flight, transit from airport). Spend the ' +
        'rest of Day 1 acclimatizing at the destination. Do NOT plan stops ' +
        'between origin and destination — flights are point-to-point. Maximize ' +
        'time AT the destination across the remaining days.';
    } else if (id.includes('private') || id === 'suv_private') {
      vehicleStyleGuidance =
        'TRAVEL PATTERN: User has a private vehicle with driver, so the trip ' +
        'is FLEXIBLE. Include 1–2 scenic stops along the route (viewpoints, ' +
        'roadside dhaba lunches, brief sightseeing detours). The vehicle waits ' +
        'between stops — leverage this. Day 1 should feel like a road trip, ' +
        'not a transit. Off-route attractions are accessible.';
    } else if (id.includes('shared') || id.startsWith('daewoo')) {
      vehicleStyleGuidance =
        'TRAVEL PATTERN: User is on shared/public transport, so route is ' +
        'FIXED city-to-city with NO scenic detours. Schedule travel as a ' +
        'single morning or afternoon block ending at the destination. Do NOT ' +
        'plan roadside stops or detours — the bus does not stop for tourists. ' +
        'Activities begin only AFTER arrival at the destination.';
    } else if (id === 'coaster_private') {
      vehicleStyleGuidance =
        'TRAVEL PATTERN: Group has a private coaster, so the itinerary is ' +
        'FLEXIBLE but logistics-heavy (more loading time, longer rest stops). ' +
        'Activities must accommodate a larger group — pick group-friendly ' +
        'venues. One or two scenic stops are appropriate but not many.';
    }

    // Day 5A: include fuel cost transparency for private vehicles. Helps
    // Gemini set realistic per-day fuel-line items in the breakdown.
    let fuelLine = '';
    if (!vehicle.isPublicTransport && vehicle.fuelEfficiencyKmPerLiter > 0) {
      const fuelCost = computeFuelCost({
        vehicle,
        distanceKm: distance * 2,
        fuelPricePerLiterPKR: adminCfg.fuelPricePerLiterPKR,
      });
      fuelLine =
        `Fuel-only portion at PKR ${adminCfg.fuelPricePerLiterPKR}/litre ` +
        `(${vehicle.fuelEfficiencyKmPerLiter} km/L) ≈ PKR ${fuelCost.toLocaleString()} of the round-trip cost.\n`;
    }

    vehicleBlock =
      `\nTraveler's chosen transport: ${vehicle.label} — ${vehicle.description}\n` +
      `Capacity ${vehicle.capacity} ${vehicle.capacity === 1 ? 'person' : 'people'}, ` +
      `${vehicle.isShared ? 'shared/per-person' : 'private/per-vehicle'} pricing. ` +
      `Group size: ${groupSize}.\n` +
      `Round-trip transport cost: PKR ${roundTripCost.toLocaleString()} — ` +
      `use EXACTLY this number for the transport line-item; do not estimate your own.\n` +
      fuelLine +
      `${vehicleStyleGuidance}\n`;
  } else {
    // No vehicleId provided — assume intercity shared van (Pakistan default)
    // and tell Gemini to plan accordingly. Better than letting it invent.
    vehicleBlock =
      `\nTraveler did not specify transport. Assume shared intercity bus/van ` +
      `(Daewoo / Faisal Movers / Hiace shared) for the journey. Plan as a ` +
      `direct city-to-city transit, no scenic detours. Group size: ${groupSize}.\n`;
  }

  // ── Round 2 (Option B): ML-grounded cost guidance ────────────────────
  // The frontend / ai.controller predicts the realistic cost range from
  // a learned ML model BEFORE calling Gemini. We pass that range as a
  // prompt-level constraint so Gemini generates natural-looking line
  // items that sum to a defensible total — no post-hoc scaling required.
  //
  // The hint is optional; if ML service is down the controller leaves
  // mlCostHint undefined and we fall back to budget-only guidance.
  let mlCostBlock = '';
  const mlHint = (input as TripGenerationInput & {
    mlCostHint?: { low: number; high: number; predicted: number };
  }).mlCostHint;
  if (mlHint && mlHint.low > 0 && mlHint.high > 0) {
    const target = Math.round((mlHint.low + mlHint.high) / 2);
    mlCostBlock =
      `\nML-GROUNDED COST TARGET (HIGHEST PRIORITY): Based on a learned cost ` +
      `model trained on similar Pakistan trips, this itinerary is expected ` +
      `to cost between PKR ${mlHint.low.toLocaleString()} and ` +
      `PKR ${mlHint.high.toLocaleString()} total — target approximately ` +
      `PKR ${target.toLocaleString()}.\n` +
      `Generate REALISTIC line-item costs that naturally sum to this target. ` +
      `Anchor your numbers to typical Pakistan economics:\n` +
      `  • Mid-tier hotels: PKR 6,000–12,000/night\n` +
      `  • Budget guesthouses: PKR 2,500–5,000/night\n` +
      `  • Premium hotels: PKR 15,000–30,000/night\n` +
      `  • Local meals: PKR 300–800/person\n` +
      `  • Mid-range restaurants: PKR 1,200–2,500/person\n` +
      `  • Day trips with guide: PKR 8,000–25,000/group\n` +
      `  • Entry tickets / activities: PKR 200–2,000/person typical\n` +
      `If your TOTAL falls outside [${mlHint.low.toLocaleString()}, ${mlHint.high.toLocaleString()}] ` +
      `the system will flag the trip as cost-mismatched. Stay within range.\n`;
  }

  // ── Day 4 fix: hard budget enforcement instructions ──────────────────
  // The OLD prompt said "Budget: PKR X allocated for mid-range to premium
  // experiences" — Gemini interpreted this as a soft suggestion and routinely
  // produced trips 2-3x over budget. The new wording is explicit:
  //   - "DO NOT exceed PKR X in total"
  //   - Provides a target distribution so Gemini doesn't over-allocate to
  //     one category
  //   - Tells Gemini what to do if budget is tight (downgrade accommodations,
  //     trim activities) rather than just blowing past the limit
  //
  // Round 2 note: when the ML cost target above provides a tighter range,
  // it takes priority. The budget constraint becomes a USER PREFERENCE
  // ceiling rather than the primary cost driver.
  const budgetGuidance =
    `\nBUDGET CONSTRAINT (USER PREFERENCE): User specified PKR ${budget.toLocaleString()} as their target. ` +
    `Try to stay near this number, but the ML-grounded cost target above takes precedence ` +
    `if there's a conflict (a realistic itinerary costs what it costs).\n` +
    `Target distribution: ~30% accommodation, ~25% transport, ~25% food, ~20% activities.\n` +
    `If user budget is significantly below ML-grounded cost target, prioritize: ` +
    `(1) downgrade accommodation tier (Mid → Budget), ` +
    `(2) reduce paid activities and lean on free/low-cost ones (parks, viewpoints, mosques, bazaars), ` +
    `(3) suggest local eateries instead of premium restaurants.\n`;

  return `You are a high-level strategic travel architect specializing in the Pakistani landscape. Generate a comprehensive ${days}-day logistical itinerary from ${input.origin} to ${input.destination}.
All financial figures MUST be strictly in PKR (Pakistani Rupee).
${constraintsBlock}${vehicleBlock}${mlCostBlock}${budgetGuidance}
Travel Context for Pakistan:
- Local transport: HIACE/Coasters for Gilgit-Skardu, Daewoo/Faisal Movers for M-Tag highways, Indriver/Bykea for metro areas.
- Connectivity: Mention SCOM for Northern Areas, Zong/Jazz for metros.
- Culinary: Recommend authentic regional dishes (e.g., Chapshuro in Hunza, Saag in Punjab, Sajji in Balochistan).
- Security: Mention M-Tag requirements, motorway protocols, and high-altitude safety.

Travel Parameters:
- Point of Departure: ${input.origin}
- Target Destination: ${input.destination}
- Logistical Duration: ${days} days
- Initiation Date: ${input.startDate}
- Strategic Budget: PKR ${budget.toLocaleString()} (user preference — see ML cost target above for the authoritative range)
- User Preferences: ${preferences}

CRITICAL COST + CONTENT CONSISTENCY RULES (HIGHEST PRIORITY):

A. Each day MUST have RICH, DETAILED content. Every day's "activities" array should contain 5-8 entries covering:
   - Morning transport / departure / arrival (if applicable)
   - Breakfast (named restaurant, hotel, or local cafe)
   - 2-3 sightseeing activities or experiences (named places, attractions, viewpoints)
   - Lunch (named restaurant or local eatery)
   - Afternoon activity OR transit to next location
   - Dinner (named restaurant)
   - Optional evening activity (night market, cultural show, scenic walk)
   Do NOT omit meals. Every breakfast, lunch, and dinner gets its own activity entry with realistic cost.

B. The sum of all "dailyCost" values MUST equal "totalEstimatedCost" exactly. To achieve this:
   1. Allocate round-trip transport across the FIRST and LAST day.
   2. Allocate EACH NIGHT'S accommodation cost to its corresponding day's dailyCost.
   3. Include EVERY meal, activity, local transport, entry ticket, fuel cost, and tip in its respective day.
   4. There must be NO costs hiding outside the per-day breakdown.
   5. dailyCost MUST equal: sum(all activity costs that day) + hotel price for that night.

C. Within each day, sum(activities) + hotel price MUST approximately equal that day's dailyCost.
   Do NOT show a day total of PKR 42,000 with only PKR 12,000 of visible expenses inside.
   Every rupee in dailyCost must be backed by a visible activity cost or hotel charge.

D. Include nearby attractions / scenic stops / cultural experiences along the route, especially for private vehicles. For Lahore→Skardu mention towns like Mansehra, Naran. For Bahawalpur→Lahore mention Multan. For Karachi→Hunza mention Islamabad as transit hub.

Example check (4-day trip, total=120000):
   Day 1 dailyCost=35000: Bus(8000) + Breakfast(800) + Lunch(1500) + Hotel(8000) + Dinner(1700) + activities(15000) = 35000 ✓
   Day 2 dailyCost=30000: Breakfast(800) + 3 activities(13000) + Lunch(1500) + Hotel(8000) + Dinner(1700) + transport(5000) = 30000 ✓
   ALL daily costs must add up to 120000 exactly.

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation. Start your response with { and end with }. Schema:
{
  "summary": "Executive summary with specific Pakistani cultural context",
  "totalEstimatedCost": 250000,
  "days": [
    {
      "day": 1,
      "title": "Protocol Title",
      "activities": [
        {
          "time": "09:00",
          "type": "activity",
          "name": "Local landmark or activity",
          "location": "Address or District",
          "duration": "2.5 hours",
          "cost": 5000,
          "tips": "Specific advice on transport or local etiquette"
        }
      ],
      "hotel": {
        "name": "Verified Pakistani Accommodation",
        "location": "District",
        "price": "PKR 35,000/night",
        "rating": 4.8,
        "why": "Strategic value (e.g., safe area, central location)"
      },
      "dailyCost": 65000
    }
  ],
  "tips": ["Local connectivity/Sim card advice", "Currency exchange safety", "Cultural etiquette"],
  "bestTimeToVisit": "Seasonal advice specific to this region",
  "currency": "Pakistani Rupee (PKR)",
  "language": "Urdu/English/Local dialect",
  "emergencyNumbers": "15 (Police), 1122 (Medical), National Highways (130)"
}`;
};

// ─── Bulletproof JSON extractor ────────────────────────────────────────────
// gemini-2.5-flash wraps output in ```json...``` even when told not to.
// Handles every known case: pure JSON, fenced JSON, prose before/after JSON.
const extractJSON = (raw: string): string => {
  // Case 1: strip ```json ... ``` or ``` ... ``` fence (most common issue)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // Case 2: find outermost { ... } block (handles leading/trailing prose)
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1).trim();
  }

  // Case 3: return trimmed raw as last resort
  return raw.trim();
};

// ─── Main service function ─────────────────────────────────────────────────
export const generateTripItinerary = async (
  input: TripGenerationInput
): Promise<GeminiItineraryResponse> => {
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
      // Force pure JSON output — supported by gemini-1.5-flash and gemini-2.5-flash
      responseMimeType: 'application/json',
    },
  });

  // SRS §3.2.4: implement request timeout of 45 seconds.
  // Gemini SDK has no built-in timeout option, so we race the call against
  // a 45s deadline. The frontend axios client uses 60s to give us headroom
  // to return a clean JSON error rather than have the client time out first.
  const AI_TIMEOUT_MS = 45_000;
  let raw: string;
  try {
    // buildPrompt is now async because it does route lookups (Geoapify/cache/dataset).
    // We build the prompt before starting the timeout race so the 45s window
    // is purely for the Gemini call itself, not our local I/O.
    const prompt = await buildPrompt(input);
    const generation = model.generateContent(prompt);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Gemini API call timed out after ${AI_TIMEOUT_MS / 1000}s`)),
        AI_TIMEOUT_MS
      )
    );
    const result = await Promise.race([generation, timeout]);
    raw = result.response.text();
  } catch (err) {
    throw new Error(`Gemini API call failed: ${(err as Error).message}`);
  }

  // Dev logging so you can see exactly what Gemini returned
  if (config.nodeEnv === 'development') {
    console.log('\n[Gemini raw response - first 300 chars]:\n', raw.slice(0, 300), '\n');
  }

  const cleaned = extractJSON(raw);

  let parsed: GeminiItineraryResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[Gemini parse failed] Full raw output:\n', raw.slice(0, 800));
    throw new Error('AI returned malformed JSON. Please try again.');
  }

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('AI returned an empty itinerary. Please try again.');
  }

  return parsed;
};

// ─── Refinement prompt builder ─────────────────────────────────────────────
// For Round 7: conversational refinement. Takes the existing trip + the
// previously-generated itinerary + a free-text instruction and returns a
// fresh, fully-replaced itinerary that incorporates the user's request.
//
// Design notes:
// - Pakistan-only constraint: prompt explicitly refuses off-Pakistan rewrites.
//   If user asks to "change destination to Tokyo," AI will keep destination
//   the same and return a polite note inside the summary.
// - Currency: PKR is hardcoded into the prompt to prevent USD slippage.
// - Cultural: prayer times, halal food, modesty, female-traveler safety,
//   and Northern Areas seasonality are all surfaced as default considerations.

interface RefinementInput {
  origin: string;
  destination: string;
  days: number;
  budget: number;
  startDate: string;
  // The previous itinerary as JSON — what the user is currently looking at.
  currentItinerary: GeminiItineraryResponse;
  // Free-text user instruction, e.g. "Suggest cheaper hotels".
  instruction: string;
}

const buildRefinementPrompt = (input: RefinementInput): string => {
  return `You are a strategic travel architect specializing in Pakistani travel. The user has an existing ${input.days}-day itinerary from ${input.origin} to ${input.destination} and wants to refine it.

PAKISTAN-ONLY CONSTRAINT (CRITICAL):
- This trip MUST stay within Pakistan. Origin: ${input.origin}. Destination: ${input.destination}.
- If the user's request would change the destination outside Pakistan, IGNORE that part of the request and keep the destination as-is. Note this in the summary.
- All financial figures MUST remain in PKR (Pakistani Rupee). Never convert to USD or other currencies.

CULTURAL CONTEXT FOR PAKISTANI TRAVELERS:
- Default to halal food unless user explicitly says otherwise.
- Build in prayer-friendly buffers (5 daily salah times) around major activities when reasonable.
- Be aware of female-traveler safety concerns — suggest verified hotels, well-traveled routes, and group tour options when relevant.
- For Northern Areas (Hunza, Skardu, Naran, Fairy Meadows, Khunjerab): these are SNOW-CLOSED Nov–April. If the trip dates conflict with the user's request, mention the seasonality issue in the summary and adapt accordingly.
- Prefer authentic local options: Daewoo/Faisal Movers (highways), HIACE/Coasters (Northern), PIA/SereneAir/Airblue (domestic flights), Careem/inDrive (urban rides). NO Uber (left Pakistan in 2022).

REFINEMENT TASK:
The user's current itinerary is:
${JSON.stringify(input.currentItinerary, null, 2)}

The user's refinement request is:
"${input.instruction}"

Apply this refinement intelligently. You may:
- Adjust hotel choices (cheaper/pricier/different vibe)
- Swap activities (skip museums, add markets, add shrines, add food spots, etc.)
- Modify pace (more relaxed, more packed)
- Change transport (bus vs flight vs train)
- Add cultural/religious elements (mosques, dargahs, langar)
- Restructure days

You MUST:
- Keep the same destination, dates, and total number of days unless the user explicitly asked to change them.
- Stay within or close to the original budget of PKR ${input.budget} (you may go up to 20% over if user asked for "premium" / "luxury", or down to 50% under if user asked for "budget" / "cheaper").
- Return a COMPLETE replacement itinerary, not a partial diff.

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation. Start your response with { and end with }. Use the EXACT same schema as the current itinerary:
{
  "summary": "Brief executive summary noting what changed in this refinement",
  "totalEstimatedCost": 250000,
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "activities": [
        { "time": "09:00", "type": "activity", "name": "...", "location": "...", "duration": "...", "cost": 5000, "tips": "..." }
      ],
      "hotel": { "name": "...", "location": "...", "price": "PKR ...", "rating": 4.5, "why": "..." },
      "dailyCost": 65000
    }
  ],
  "tips": ["...", "...", "..."],
  "bestTimeToVisit": "...",
  "currency": "Pakistani Rupee (PKR)",
  "language": "Urdu/English",
  "emergencyNumbers": "15 (Police), 1122 (Medical)"
}`;
};

/**
 * Refine an existing itinerary based on a user instruction.
 *
 * Returns a fresh full itinerary — caller is responsible for storing it
 * in the trip's `refinements` history and updating the active itinerary.
 */
export const refineTripItinerary = async (
  input: RefinementInput
): Promise<GeminiItineraryResponse> => {
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      // Slightly lower temperature than initial generation — refinement should
      // make focused changes, not get creative with the whole thing.
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  // Same 45s timeout as initial generation — refinement is single Gemini call.
  const AI_TIMEOUT_MS = 45_000;
  let raw: string;
  try {
    const generation = model.generateContent(buildRefinementPrompt(input));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Gemini API call timed out after ${AI_TIMEOUT_MS / 1000}s`)),
        AI_TIMEOUT_MS
      )
    );
    const result = await Promise.race([generation, timeout]);
    raw = result.response.text();
  } catch (err) {
    throw new Error(`Gemini API call failed: ${(err as Error).message}`);
  }

  if (config.nodeEnv === 'development') {
    console.log('\n[Gemini refinement raw - first 300 chars]:\n', raw.slice(0, 300), '\n');
  }

  const cleaned = extractJSON(raw);

  let parsed: GeminiItineraryResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[Gemini refinement parse failed] Full raw output:\n', raw.slice(0, 800));
    throw new Error('AI returned malformed JSON during refinement. Please try again.');
  }

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('AI returned an empty itinerary during refinement. Please try again.');
  }

  return parsed;
};

// ─── Insider Insights prompt + service (Day 4 Msg 2) ───────────────────────
// Pro-only feature. Given a destination + itinerary context, returns 6-8
// tightly-scoped local insider tips across categories (hidden gems, halal
// food, photo spots, female safety, cultural etiquette, transport hacks).
//
// Design:
// - Pakistan-only: prompt explicitly anchors to Pakistani travel context
//   so we don't get generic "tips for tourists in Asia" output.
// - Returns categorized tips so the frontend can render them in distinct
//   sections with category-specific icons.
// - Doesn't include hotel/restaurant prices (those go stale fast). Focuses
//   on durable cultural/contextual knowledge.
// - Halal-by-default: food tips assume halal unless user explicitly asks
//   otherwise — same convention as refinement prompt.

interface InsightsInput {
  destination: string;
  origin?: string;
  days?: number;
  startDate?: string;
  // Optional: feed in a few activity names from the itinerary so Gemini's
  // tips can complement (rather than duplicate) what's already planned.
  itineraryHighlights?: string[];
}

interface InsiderTip {
  category: string;
  title: string;
  detail: string;
}

interface InsiderInsightsResponse {
  destination: string;
  tips: InsiderTip[];
}

const VALID_CATEGORIES = new Set([
  'hidden_gem',
  'food',
  'culture',
  'safety',
  'photo',
  'transport',
  'shopping',
  'tip',
]);

const buildInsightsPrompt = (input: InsightsInput): string => {
  const highlightsLine = input.itineraryHighlights && input.itineraryHighlights.length > 0
    ? `\nThe traveler's itinerary already includes: ${input.itineraryHighlights.slice(0, 8).join(', ')}. Avoid duplicating these — your tips should COMPLEMENT them.\n`
    : '';

  return `You are a Pakistani local guide sharing insider tips for travelers visiting ${input.destination}. Generate 6-8 tightly-scoped, genuinely useful local insights that a tourist book WOULDN'T tell them.

PAKISTAN-ONLY CONTEXT:
- Destination is ${input.destination}, within Pakistan.
- Audience: Pakistani and foreign travelers heading to this destination.
- Default to halal food. Default to prayer-friendly schedules. Default to culturally appropriate suggestions.
- For Northern Areas (Hunza, Skardu, Naran, Fairy Meadows, Khunjerab, Phander, Astore, etc.): mention seasonality if relevant (snow Nov–April, jeep tracks, altitude considerations).
- For Balochistan (Gwadar, Quetta, Hingol): mention NOC/security awareness if relevant.
- For conservative areas: include modest-dress and etiquette advice tactfully.
${highlightsLine}
WHAT MAKES A GOOD INSIDER TIP:
- Specific, not generic. "Visit Eagle's Nest at sunrise — the light hits Rakaposhi's east face around 6:15am" beats "see scenic viewpoints."
- Names real places, real times, real prices when relevant (in PKR).
- Calls out the WHY — context that helps the traveler avoid a mistake or unlock a better experience.
- Female-traveler safety should be practical and respectful, not paranoid.
- Photo tips should mention the time of day, light direction, or vantage point.
- Food tips should name specific dishes and where to find them (and roughly what they cost).
- Cultural tips should explain what to DO, not just what to avoid.

CATEGORIES (use these exact strings):
- "hidden_gem"  — off-the-beaten-path viewpoints, lesser-known spots
- "food"        — authentic local food spots, signature dishes
- "culture"     — etiquette, dress code, local customs, taboos
- "safety"      — female-traveler tips, neighborhood advice, scams
- "photo"       — best photo spots, golden-hour timing, vantage points
- "transport"   — local transport hacks, fare tips, route advice
- "shopping"    — bazaars, what to buy, bargaining etiquette
- "tip"         — general "wish I'd known" items that don't fit above

Aim for variety — at least 4 different categories represented.

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation. Start with { and end with }. Schema:
{
  "destination": "${input.destination}",
  "tips": [
    {
      "category": "hidden_gem",
      "title": "Short headline, 6–10 words",
      "detail": "One or two sentences with specific advice. Mention real places, times, or prices in PKR when relevant."
    }
  ]
}`;
};

/**
 * Generate insider insights for a destination.
 *
 * Pro-only — caller MUST verify user.plan === 'pro' before invoking.
 *
 * Best-effort: throws on Gemini failure or malformed output. Caller should
 * treat errors as recoverable (show user a "try again" message) rather
 * than fatal.
 */
export const generateInsiderInsights = async (
  input: InsightsInput
): Promise<InsiderInsightsResponse> => {
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      // Higher temperature than itinerary generation — we want creative,
      // genuinely-insider feel, not boilerplate. Low enough to keep things
      // grounded in real Pakistan.
      temperature: 0.85,
      topP: 0.9,
      // Insights are small (6-8 short tips). Cap output to keep latency low.
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  // Insights are smaller than itineraries — 30s is plenty.
  const AI_TIMEOUT_MS = 30_000;
  let raw: string;
  try {
    const generation = model.generateContent(buildInsightsPrompt(input));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Gemini API call timed out after ${AI_TIMEOUT_MS / 1000}s`)),
        AI_TIMEOUT_MS
      )
    );
    const result = await Promise.race([generation, timeout]);
    raw = result.response.text();
  } catch (err) {
    throw new Error(`Gemini API call failed: ${(err as Error).message}`);
  }

  if (config.nodeEnv === 'development') {
    console.log('\n[Gemini insights raw - first 300 chars]:\n', raw.slice(0, 300), '\n');
  }

  const cleaned = extractJSON(raw);

  let parsed: InsiderInsightsResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[Gemini insights parse failed] Full raw output:\n', raw.slice(0, 800));
    throw new Error('AI returned malformed JSON for insights. Please try again.');
  }

  if (!parsed.tips || !Array.isArray(parsed.tips) || parsed.tips.length === 0) {
    throw new Error('AI returned no insights. Please try again.');
  }

  // Sanity-clean: ensure each tip has a valid category, title, and detail.
  // Drop malformed ones rather than failing the whole request — Gemini
  // occasionally adds an empty trailing entry or uses a category we don't
  // recognise. Better to return 6 good tips than throw on the 7th.
  const cleanTips = parsed.tips
    .filter((t) => t && typeof t.title === 'string' && typeof t.detail === 'string')
    .map((t) => ({
      category: VALID_CATEGORIES.has(t.category) ? t.category : 'tip',
      title: t.title.trim().slice(0, 120),
      detail: t.detail.trim().slice(0, 400),
    }))
    .filter((t) => t.title.length > 0 && t.detail.length > 0)
    .slice(0, 8); // hard cap at 8 even if AI returned more

  if (cleanTips.length === 0) {
    throw new Error('AI returned no usable insights. Please try again.');
  }

  return {
    destination: parsed.destination || input.destination,
    tips: cleanTips,
  };
};