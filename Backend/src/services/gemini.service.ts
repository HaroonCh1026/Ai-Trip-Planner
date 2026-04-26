import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/config';
import { TripGenerationInput, GeminiItineraryResponse } from '../types';

// ─── Singleton client ──────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// ─── Build the exact same prompt used in frontend config.js ───────────────
const buildPrompt = (input: TripGenerationInput): string => {
  const days = Number(input.days);
  const budget = Number(input.budget);
  const preferences = input.preferences || 'Architecture, Culture, Logistics';

  return `You are a high-level strategic travel architect specializing in the Pakistani landscape. Generate a comprehensive ${days}-day logistical itinerary from ${input.origin} to ${input.destination}.
All financial figures MUST be strictly in PKR (Pakistani Rupee).

Travel Context for Pakistan:
- Local transport: HIACE/Coasters for Gilgit-Skardu, Daewoo/Faisal Movers for M-Tag highways, Indriver/Bykea for metro areas.
- Connectivity: Mention SCOM for Northern Areas, Zong/Jazz for metros.
- Culinary: Recommend authentic regional dishes (e.g., Chapshuro in Hunza, Saag in Punjab, Sajji in Balochistan).
- Security: Mention M-Tag requirements, motorway protocols, and high-altitude safety.
- Budget: PKR ${budget} allocated for mid-range to premium experiences (Serena/PC/LUXUS).

Travel Parameters:
- Point of Departure: ${input.origin}
- Target Destination: ${input.destination}
- Logistical Duration: ${days} days
- Initiation Date: ${input.startDate}
- Strategic Budget: PKR ${budget}
- User Preferences: ${preferences}

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
    const generation = model.generateContent(buildPrompt(input));
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