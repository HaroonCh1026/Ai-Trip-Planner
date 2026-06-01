/**
 * mlService.ts — Node-side wrapper around the Python ML microservice.
 *
 * The actual model runs in a separate Python Flask process on port 5001
 * (started via `cd ML && python service.py`). This file is the typed
 * adapter that the rest of the Node backend uses to make predictions.
 *
 * Design notes:
 * - Never throws on ML failures. Returns null. Callers decide whether to
 *   surface a "model unavailable" UI or silently skip the validation.
 *   This is the same fail-open pattern we use for email — the ML service
 *   is a side-channel that enriches but is never critical-path.
 * - 3-second timeout. The Flask service typically responds in <100ms;
 *   anything slower means it's stuck or the process died.
 * - Lightweight LRU-style caching could be added later if we see repeat
 *   predictions for the same trip; for now every call hits Python.
 */

import config from '../config/config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MLPredictionInput {
  distance_km: number;
  duration_days: number;
  traveler_age: number;
  group_size: number;
  region: string;                     // 'Punjab' | 'KPK' | 'Gilgit-Baltistan' | 'Sindh' | 'AJK' | 'Balochistan'
  traveler_gender: string;            // 'Male' | 'Female'
  traveler_nationality: string;       // 'Pakistani' | 'Foreign'
  trip_type: string;                  // 'Adventure' | 'Business' | 'Family' | 'Leisure'
  accommodation_type: string;         // 'Budget' | 'Mid' | 'Luxury'
  transportation_type: string;        // 'Flight' | 'Road (Hiace)' | 'Road (Coaster)' | 'Road (Car (Small))' | 'Road (Car (SUV))'
  season: string;                     // 'Summer' | 'Winter' | 'Spring' | 'Autumn'
}

export interface MLPrediction {
  predicted_cost_pkr: number;
  low_pkr: number;
  high_pkr: number;
  rmse_pkr: number;
  currency: string;
}

export interface MLMeta {
  trained_at: string;
  dataset_rows: number;
  winning_model: string;
  metrics: { mae: number; rmse: number; r2: number };
  // ...other fields available; see model_meta.json on disk
}

// ─── Internals ──────────────────────────────────────────────────────────────

const ML_BASE_URL = config.ml?.baseUrl || 'http://127.0.0.1:5001';
const TIMEOUT_MS = 3000;

/**
 * Helper that wraps fetch with a timeout. AbortController is the
 * standard way; setTimeout fires `controller.abort()` which causes
 * fetch to reject with an AbortError we catch upstream.
 */
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Predict total trip cost in PKR.
 *
 * Returns null on any failure (network down, ML service offline, validation
 * error, timeout). Callers should treat null as "we don't know — proceed
 * without ML enrichment."
 */
export const predictTripCost = async (
  input: MLPredictionInput
): Promise<MLPrediction | null> => {
  try {
    const res = await fetchWithTimeout(`${ML_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '<no body>');
      console.warn(`[mlService] /predict returned ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { success: boolean; prediction?: MLPrediction };
    if (!data.success || !data.prediction) return null;
    return data.prediction;
  } catch (err) {
    // Most common cause: ML service not running. Don't spam logs.
    if ((err as Error).name !== 'AbortError') {
      console.warn(`[mlService] Predict failed: ${(err as Error).message}`);
    }
    return null;
  }
};

/**
 * Batch prediction — used by admin analytics to back-fill predictions for
 * historical trips when generating "predicted vs actual" charts.
 */
export const predictBatch = async (
  trips: MLPredictionInput[]
): Promise<MLPrediction[] | null> => {
  if (trips.length === 0) return [];
  if (trips.length > 1000) {
    console.warn('[mlService] Batch size capped at 1000');
    trips = trips.slice(0, 1000);
  }
  try {
    const res = await fetchWithTimeout(`${ML_BASE_URL}/predict/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trips }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; predictions?: MLPrediction[] };
    if (!data.success || !data.predictions) return null;
    return data.predictions;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.warn(`[mlService] Batch predict failed: ${(err as Error).message}`);
    }
    return null;
  }
};

/**
 * Fetch model metadata (R², MAE, training date, supported categories).
 * Used by the admin analytics tab to render the "model quality" panel.
 */
export const getMLMeta = async (): Promise<MLMeta | null> => {
  try {
    const res = await fetchWithTimeout(`${ML_BASE_URL}/meta`);
    if (!res.ok) return null;
    return (await res.json()) as MLMeta;
  } catch {
    return null;
  }
};

/**
 * Quick health check for the ML service. Used by admin panel startup checks.
 * Faster than a full prediction call.
 */
export const isMLAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${ML_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
};

// ─── Helpers for callers ────────────────────────────────────────────────────

/**
 * Map our existing trip generation inputs (which use slightly different
 * naming and richer types) to the ML service's flat schema. Callers usually
 * have a Trip object or a TripGenerationInput — they can pass it through
 * here to avoid hand-coding the mapping each time.
 *
 * Returns null if any required field is missing or unmappable, so the
 * caller can skip ML enrichment without crashing.
 */
export const buildMLInputFromTrip = (trip: {
  origin?: string;
  destination?: string;
  days?: number | string;
  budget?: number | string;
  startDate?: string;
  preferences?: string;
  // optional richer fields if available
  distanceKm?: number;
  travelerAge?: number;
  travelerGender?: string;
  travelerNationality?: string;
  groupSize?: number;
  tripType?: string;
  accommodationType?: string;
  transportationType?: string;
  vehicleId?: string;            // catalog id; mapped to a trained transport category
  region?: string;
  season?: string;
}): MLPredictionInput | null => {
  const days = Number(trip.days);
  if (!days || Number.isNaN(days)) return null;

  // Fall back to sensible defaults when the existing trip flow doesn't
  // collect a particular field. These are conservative middle-of-distribution
  // values from the dataset — the model still gives a useful estimate.
  const input: MLPredictionInput = {
    distance_km: trip.distanceKm ?? 500,
    duration_days: days,
    traveler_age: trip.travelerAge ?? 30,
    group_size: trip.groupSize ?? 2,
    region: trip.region ?? guessRegion(trip.destination || ''),
    traveler_gender: trip.travelerGender ?? 'Male',
    traveler_nationality: trip.travelerNationality ?? 'Pakistani',
    trip_type: trip.tripType ?? guessTripType(trip.preferences || ''),
    accommodation_type: trip.accommodationType ?? guessAccommodationTier(Number(trip.budget) || 0, days, trip.groupSize ?? 2),
    transportation_type: trip.transportationType ?? mapVehicleToMLTransport(trip.vehicleId),
    season: trip.season ?? guessSeason(trip.startDate || ''),
  };
  return input;
};

// Quick-and-dirty heuristics for filling defaults. These are helpers for
// the *current* trip flow; once we add explicit fields to TripCreator
// (Day 3 of the plan), these heuristics fall away.

const REGION_KEYWORDS: Array<[RegExp, string]> = [
  [/hunza|skardu|gilgit|naltar|fairy meadows|deosai|attabad|khaplu|astore|nanga parbat/i, 'Gilgit-Baltistan'],
  [/lahore|islamabad|rawalpindi|murree|faisalabad|multan|sialkot|gujranwala|bahawalpur|cholistan|harappa|taxila/i, 'Punjab'],
  [/karachi|hyderabad|sukkur|larkana|mohenjo|thar|keenjhar/i, 'Sindh'],
  [/peshawar|swat|kalam|chitral|kalash|naran|kaghan|abbottabad|nathia|ayubia|saif-ul-malook|babusar/i, 'KPK'],
  [/quetta|gwadar|hingol|ziarat|hanna|astola|ormara/i, 'Balochistan'],
  [/muzaffarabad|neelum|sharda|kel|arang|toli pir|rawalakot|banjosa|pir chinasi|leepa/i, 'AJK'],
];

function guessRegion(destination: string): string {
  for (const [re, region] of REGION_KEYWORDS) {
    if (re.test(destination)) return region;
  }
  return 'Punjab';  // safest default — most trips
}

function guessTripType(preferences: string): string {
  const p = preferences.toLowerCase();
  if (/business|work|conference|meeting/.test(p)) return 'Business';
  if (/family|kids|children/.test(p)) return 'Family';
  if (/adventure|trek|hike|climb|jeep|expedition/.test(p)) return 'Adventure';
  return 'Leisure';
}

function guessAccommodationTier(budget: number, days: number, groupSize: number): string {
  // Tier from per-PERSON-per-DAY spend, with thresholds that DEPEND ON PARTY
  // SIZE. Solo travellers and couples don't split fixed costs (one room, one
  // vehicle), so their per-head spend is naturally higher at the SAME tier:
  // in the dataset a solo Mid trip runs ~PKR 18k/person/day, a couple ~11.4k,
  // a group ~11.2k. Flat thresholds wrongly pushed a modest solo budget into
  // Luxury and then told the user their budget was "low". The boundaries below
  // are the midpoints between adjacent tier centres for each party bucket, so
  // the chosen tier is realistic whether the user is solo, a couple, a family,
  // or a group.
  if (!budget || !days) return 'Mid';
  const grp = Math.max(1, groupSize || 1);
  const perPersonPerDay = budget / (days * grp);

  let lowMid: number;   // Budget / Mid boundary
  let midLux: number;   // Mid / Luxury boundary
  if (grp === 1) {
    lowMid = 13500;
    midLux = 27000;
  } else if (grp === 2) {
    lowMid = 9000;
    midLux = 18000;
  } else {
    lowMid = 8500;
    midLux = 17500;
  }

  if (perPersonPerDay < lowMid) return 'Budget';
  if (perPersonPerDay > midLux) return 'Luxury';
  return 'Mid';
}

function guessSeason(startDate: string): string {
  if (!startDate) return 'Summer';
  // Try parsing as YYYY-MM-DD first, then fallback to Date constructor.
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return 'Summer';
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'Spring';
  if (m >= 6 && m <= 8) return 'Summer';
  if (m >= 9 && m <= 11) return 'Autumn';
  return 'Winter';
}

// ── Vehicle to ML transport-category mapping ────────────────────────────────
// The model was trained on five transport categories (see model_meta.json).
// Previously the controller never passed the user's vehicle through, so every
// prediction silently assumed 'Road (Hiace)' regardless of whether the user
// picked a flight or a small car. That made the vehicle choice invisible to
// the cost estimate. This maps each catalog vehicleId onto the closest
// trained category. Unknown / unset falls back to the dataset's most common
// road mode so behaviour is unchanged when no vehicle was chosen.
export function mapVehicleToMLTransport(vehicleId?: string): string {
  switch (vehicleId) {
    case 'flight_economy':
      return 'Flight';
    case 'suv_private':
      return 'Road (Car (SUV))';
    case 'hatchback_private':
    case 'sedan_private':
    case 'sedan_shared':
      return 'Road (Car (Small))';
    case 'coaster_private':
    case 'daewoo_business':
    case 'daewoo_economy':
      return 'Road (Coaster)';
    case 'hiace_private':
    case 'hiace_shared':
      return 'Road (Hiace)';
    default:
      return 'Road (Hiace)';
  }
}