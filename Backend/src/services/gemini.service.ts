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