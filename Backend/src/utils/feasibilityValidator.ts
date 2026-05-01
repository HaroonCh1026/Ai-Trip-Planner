/**
 * feasibilityValidator.ts — verify that an AI-generated itinerary is
 * physically possible to execute given real-world Pakistani distances and
 * travel times.
 *
 * Catches Gemini's most common failure mode: stringing together attractions
 * across half the country into a single day. If a user's day shows
 * "9am Lahore Fort, 11am Naran Valley", that's 600km in 2 hours — physically
 * impossible without a private jet.
 *
 * Used by ai.controller.ts after Gemini returns. Violations are surfaced
 * to the user as warnings on the itinerary (not blocking errors — sometimes
 * Gemini's plan is fine but our validator is being conservative because
 * a destination isn't in our distance matrix).
 *
 * The validator is INTENTIONALLY soft: when in doubt, it does NOT flag.
 * False positives (warning on a fine plan) are worse than false negatives
 * (missing a real issue) because the latter just means we behave like the
 * old version. The user always sees Gemini's plan; warnings are advisory.
 *
 * IMPORTANT: this module is async because route lookups now go through the
 * hybrid routingService (Geoapify → curated → dataset). The Gemini service
 * already runs in an async context so this isn't a behavior change for
 * callers — just an `await`.
 */

import { getRoute, getFastestTravelHours } from '../services/routingService';

// ─── Public types ───────────────────────────────────────────────────────────

export interface FeasibilityViolation {
  day: number;                 // 1-indexed day where the issue occurs
  severity: 'warning' | 'critical';
  type:
    | 'insufficient_travel_time'
    | 'too_many_distant_locations'
    | 'overpacked_day';
  message: string;             // human-readable explanation for the UI
  details?: {
    fromLocation?: string;
    toLocation?: string;
    requiredHours?: number;
    availableHours?: number;
  };
}

export interface FeasibilityReport {
  feasible: boolean;
  violations: FeasibilityViolation[];
  warningCount: number;
  criticalCount: number;
}

interface ItineraryActivity {
  time?: string;
  name?: string;
  location?: string;
  duration?: string;
}

interface ItineraryDay {
  day: number;
  title?: string;
  activities?: ItineraryActivity[];
}

// ─── Time parsing helpers ───────────────────────────────────────────────────

function parseTimeToHours(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();

  // 24-hour: "14:00", "09:30"
  const military = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (military) {
    const h = parseInt(military[1], 10);
    const m = parseInt(military[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60;
  }

  // 12-hour: "9:30 AM", "2:00 PM", "9 AM"
  const ampm = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const period = ampm[3];
    if (h === 12) h = 0;
    if (period === 'PM') h += 12;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60;
  }

  return null;
}

function parseDurationToHours(durStr: string | undefined): number {
  if (!durStr) return 0.5; // assume ~30 min for unspecified durations

  const cleaned = durStr.toLowerCase();
  const hours = cleaned.match(/(\d+(?:\.\d+)?)\s*h(?:our|r)?s?/);
  if (hours) return parseFloat(hours[1]);

  const minutes = cleaned.match(/(\d+)\s*m(?:in|inute)?s?/);
  if (minutes) return parseInt(minutes[1], 10) / 60;

  return 0.5;
}

// ─── Validators ─────────────────────────────────────────────────────────────

async function checkConsecutiveActivities(
  prev: ItineraryActivity,
  next: ItineraryActivity,
  dayNumber: number
): Promise<FeasibilityViolation | null> {
  if (!prev.location || !next.location) return null;

  // Compare locations with a forgiving heuristic — Gemini sometimes writes
  // "Muzaffarabad" then "Muzaffarabad city center" for what's effectively the
  // same place. If either string contains the other (after lowercasing and
  // stripping common qualifiers), treat them as the same location and skip.
  const prevLoc = prev.location.trim().toLowerCase();
  const nextLoc = next.location.trim().toLowerCase();
  if (prevLoc === nextLoc) return null;
  if (prevLoc.includes(nextLoc) || nextLoc.includes(prevLoc)) return null;

  const prevTime = parseTimeToHours(prev.time);
  const nextTime = parseTimeToHours(next.time);
  if (prevTime === null || nextTime === null) return null;

  const prevDuration = parseDurationToHours(prev.duration);
  const availableHours = nextTime - (prevTime + prevDuration);

  // Only flag GENUINE overlaps (>30 min of overlap). Micro-overlaps and
  // zero-gap transitions are usually fine — they happen when Gemini ends one
  // activity at 13:00 and starts the next at 13:00 (which is what real
  // schedules look like). We give half an hour of grace before complaining.
  if (availableHours < -0.5) {
    return {
      day: dayNumber,
      severity: 'warning',
      type: 'overpacked_day',
      message: `${prev.name || 'an activity'} and ${next.name || 'the next activity'} appear to overlap in time`,
    };
  }

  // ── Distance-aware travel-time check ──────────────────────────────────
  // Skip when we don't have positive available time to compare against.
  // (Prev check already handled negative; this catches the zero case.)
  if (availableHours <= 0) return null;

  // Hybrid lookup — Geoapify, curated, dataset, or null
  const requiredHours = await getFastestTravelHours(prev.location, next.location);
  if (requiredHours === null) {
    return null; // no data — skip silently
  }

  // Skip the warning if both locations are clearly close to each other
  // (within 30 minutes by car) — those are intra-city movements where
  // schedules don't need to be precise to the half-hour.
  if (requiredHours <= 0.5) return null;

  // 20% buffer for traffic, parking, settling in
  const bufferedRequired = requiredHours * 1.2;
  if (bufferedRequired > availableHours) {
    const severity: 'warning' | 'critical' =
      requiredHours > availableHours * 2 ? 'critical' : 'warning';
    return {
      day: dayNumber,
      severity,
      type: 'insufficient_travel_time',
      message:
        `Travel from ${prev.location} to ${next.location} takes about ` +
        `${requiredHours.toFixed(1)} hours, but only ${availableHours.toFixed(1)} hours ` +
        `are scheduled between activities.`,
      details: {
        fromLocation: prev.location,
        toLocation: next.location,
        requiredHours,
        availableHours,
      },
    };
  }

  return null;
}

function checkOverpackedDay(day: ItineraryDay): FeasibilityViolation | null {
  const count = day.activities?.length || 0;
  if (count >= 9) {
    return {
      day: day.day,
      severity: 'warning',
      type: 'overpacked_day',
      message: `Day ${day.day} has ${count} activities scheduled. Most travelers find 5-7 activities per day more enjoyable.`,
    };
  }
  return null;
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function validateItineraryFeasibility(
  itinerary: ItineraryDay[]
): Promise<FeasibilityReport> {
  const violations: FeasibilityViolation[] = [];

  for (const day of itinerary) {
    const acts = day.activities || [];

    // Pair-by-pair travel-time checks. We await each pair sequentially
    // rather than Promise.all — Geoapify rate limits politely (3000/day
    // is plenty but bursts can trigger 429s) and most pairs hit cache
    // anyway after the first generation, so sequential is fine.
    for (let i = 0; i < acts.length - 1; i++) {
      const v = await checkConsecutiveActivities(acts[i], acts[i + 1], day.day);
      if (v) violations.push(v);
    }

    const overpacked = checkOverpackedDay(day);
    if (overpacked) violations.push(overpacked);
  }

  const warningCount = violations.filter((v) => v.severity === 'warning').length;
  const criticalCount = violations.filter((v) => v.severity === 'critical').length;

  return {
    feasible: criticalCount === 0,
    violations,
    warningCount,
    criticalCount,
  };
}

/**
 * Build a string snippet describing the inter-city travel constraints
 * relevant to a trip, for injection into Gemini's prompt. Tells the AI
 * what's possible on the route between origin and destination.
 *
 * Example output:
 *   "Travel constraints: Lahore to Skardu is 1287km by road (about 22 hours)
 *   or 4 hours by flight via PIA/SereneAir. Plan day-by-day timing accordingly..."
 *
 * Returns null if neither origin nor destination is recognized — caller
 * should silently skip prompt enrichment in that case.
 */
export async function buildTravelConstraintsPrompt(
  origin: string,
  destination: string
): Promise<string | null> {
  const route = await getRoute(origin, destination);
  if (!route) return null;

  const lines = [`Travel between ${origin} and ${destination}:`];
  lines.push(`- ${route.kmRoad}km by road (approximately ${route.hoursRoad} hours of driving)`);
  if (route.flightAvailable && route.hoursFlight) {
    lines.push(`- Flight available: ${route.hoursFlight} hours gate-to-gate (PIA, SereneAir, or Airblue)`);
  }
  lines.push('');
  lines.push(
    'IMPORTANT: When planning the day-by-day itinerary, ensure that consecutive activities ' +
    'are reachable within the time scheduled. Do not place activities at locations far apart ' +
    'on the same day unless adequate travel time is included between them.'
  );

  return lines.join('\n');
}