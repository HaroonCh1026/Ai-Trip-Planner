/**
 * vehicleOptions.ts — Catalog of transport options for Pakistani trips.
 *
 * Used by:
 *   - Trip creator (Day 3 Message 3) — frontend UI shows these as cards
 *   - Gemini prompt enrichment — tells the AI which transport the user
 *     chose so it generates accurate per-day cost figures
 *   - Fuel cost calculator — formula needs efficiency + current fuel price
 *   - Admin pricing controls (Day 5) — admin can edit costPerKmPKR live
 *
 * COST FIGURES are anchored in current Pakistani market rates as of April
 * 2026. They are admin-editable from Day 5 onwards (stored in AdminConfig
 * collection); these constants are the seed values + fallback defaults.
 *
 * Fuel efficiency values come from manufacturer spec sheets adjusted for
 * Pakistan's road conditions (typically 15-20% worse than spec).
 */

export type VehicleCategory =
  | 'hatchback_private'
  | 'sedan_private'
  | 'sedan_shared'
  | 'suv_private'
  | 'hiace_private'
  | 'hiace_shared'
  | 'coaster_private'
  | 'daewoo_business'
  | 'daewoo_economy'
  | 'flight_economy';

export type GroupProfile = 'solo' | 'couple' | 'family' | 'group' | 'business';

export interface VehicleOption {
  id: VehicleCategory;
  label: string;                    // shown to user
  description: string;              // 1-line UI hint
  capacity: number;                 // max passengers (excluding driver)
  costPerKmPKR: number;              // RENT-only rate (driver + vehicle) per km;
                                     // fuel + tolls are added in computeTransportCost.
                                     // For shared/public this is an all-in per-person fare.
  fuelEfficiencyKmPerLiter: number;  // 0 for flights/public transport
  isShared: boolean;                 // shared = per-person pricing already factored in
  isPublicTransport: boolean;        // bus/flight (no fuel calculation needed)
  recommendedFor: GroupProfile[];   // ranking hint for the UI
  // Pakistan-specific notes shown as fine print under the option
  note?: string;
  // For flights: route-specific fixed prices. Falls back to costPerKmPKR
  // when route isn't in this dictionary.
  fixedRoutePricesPKR?: Record<string, number>;
}

// ─── Catalog ───────────────────────────────────────────────────────────────
// All values are CURRENT seed defaults. Day 5 admin panel will let the
// admin override these without redeploying.

export const VEHICLE_OPTIONS: VehicleOption[] = [
  // ── Names lead with the car model people actually recognise ──────────────
  // Labels now headline a single familiar model (Alto, Corolla, Fortuner...)
  // instead of the generic category. We keep ONE model in the label, not a
  // slash-list, on purpose: the label is fed verbatim into the Gemini
  // "VEHICLE LOCK" prompt and is matched against activity names when we assign
  // transport cost. A single clean token stays reliable on both; the alternate
  // models live in `note` where they are informational only. The `id` strings
  // are unchanged, so nothing downstream (ML buckets, admin overrides, saved
  // trips) breaks.
  {
    // Cheapest private car. Added for budget travellers who don't need a
    // full Corolla-class sedan — a small 1000cc hatchback with driver is a
    // real money-saver on shorter routes. Maps to the same ML "small car"
    // economics as the sedan; the lower costPerKmPKR is what makes it cheaper.
    id: 'hatchback_private',
    label: 'Suzuki Alto (with driver)',
    description: 'Small economy car. Cheapest private option, best for 1-3 with light luggage.',
    capacity: 3,
    costPerKmPKR: 22,   // rent only (Alto/WagonR/Cultus + driver)
    fuelEfficiencyKmPerLiter: 16,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['solo', 'couple'],
    note: 'Examples: Suzuki Alto, WagonR, Cultus. Driver included. Light luggage only.',
  },
  {
    id: 'sedan_private',
    label: 'Toyota Corolla (with driver)',
    description: 'Comfortable sedan with driver. Best for 1-3 people.',
    capacity: 3,
    costPerKmPKR: 28,   // rent only (Corolla/City/Yaris + driver)
    fuelEfficiencyKmPerLiter: 12,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['solo', 'couple', 'business'],
    note: 'Examples: Toyota Corolla, Honda City, Toyota Yaris. Driver included.',
  },
  {
    id: 'sedan_shared',
    label: 'Shared Car (inDriver / Careem)',
    description: 'Shared rideshare-style sedan. Cheapest road option.',
    capacity: 1,
    costPerKmPKR: 8,
    fuelEfficiencyKmPerLiter: 12,
    isShared: true,
    isPublicTransport: false,
    recommendedFor: ['solo'],
    note: 'Per-person pricing. Like Careem/inDriver intercity.',
  },
  {
    id: 'suv_private',
    label: 'Toyota Fortuner (4x4)',
    description: 'Spacious 4×4 — good for mountain routes & rough roads.',
    capacity: 5,
    costPerKmPKR: 45,   // rent only (Fortuner/BR-V/Sportage + driver)
    fuelEfficiencyKmPerLiter: 9,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['family', 'business'],
    note: 'Examples: Toyota Fortuner, Honda BR-V, KIA Sportage. Required for some Northern routes.',
  },
  {
    id: 'hiace_private',
    label: 'Toyota Hiace (with driver)',
    description: 'Spacious van with driver. Great for families & small groups.',
    capacity: 12,
    costPerKmPKR: 60,   // rent only (Hiace Grand Cabin + driver)
    fuelEfficiencyKmPerLiter: 7,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['family', 'group'],
    note: 'Examples: Toyota Hiace Grand Cabin. Fits luggage for full family.',
  },
  {
    id: 'hiace_shared',
    label: 'Shared Hiace Van',
    description: 'Shared van service — one of the most common intercity options.',
    capacity: 1,
    costPerKmPKR: 12,
    fuelEfficiencyKmPerLiter: 7,
    isShared: true,
    isPublicTransport: true,
    recommendedFor: ['solo', 'couple'],
    note: 'Per-person pricing. Daewoo, Faisal Movers, Skyways all run these.',
  },
  {
    id: 'coaster_private',
    label: 'Toyota Coaster (group)',
    description: 'Mini-bus — best for groups of 8 or more.',
    capacity: 22,
    costPerKmPKR: 90,   // rent only (Coaster + driver)
    fuelEfficiencyKmPerLiter: 5,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['group'],
    note: 'Examples: Toyota Coaster, Higer. Includes driver and fuel.',
  },
  {
    id: 'daewoo_business',
    label: 'Daewoo Business Class',
    description: 'Premium intercity bus with reclining seats and meals.',
    capacity: 1,
    costPerKmPKR: 4.5,
    fuelEfficiencyKmPerLiter: 0,
    isShared: true,
    isPublicTransport: true,
    recommendedFor: ['solo', 'couple', 'business'],
    note: 'Per-person pricing. Limited routes (Lahore-ISB, Lahore-Karachi, etc.).',
  },
  {
    id: 'daewoo_economy',
    label: 'Daewoo / Faisal Movers Economy',
    description: 'Reliable intercity bus, cheapest comfortable option.',
    capacity: 1,
    costPerKmPKR: 3,
    fuelEfficiencyKmPerLiter: 0,
    isShared: true,
    isPublicTransport: true,
    recommendedFor: ['solo', 'couple'],
    note: 'Per-person pricing. Frequent service on major routes.',
  },
  {
    id: 'flight_economy',
    label: 'Flight (PIA / SereneAir / Airblue)',
    description: 'Fastest option for long routes and Northern Areas.',
    capacity: 1,
    costPerKmPKR: 22,                   // approx avg per km — used as fallback
    fuelEfficiencyKmPerLiter: 0,
    isShared: true,
    isPublicTransport: true,
    recommendedFor: ['business', 'couple', 'family'],
    note: 'Per-person fares. Required for Skardu/Gilgit/Chitral in winter when roads close.',
    // Hand-curated route prices — averaged across PIA/SereneAir/Airblue
    // economy bookings for low-to-mid season. Real prices fluctuate ±30%
    // by date and how early you book.
    fixedRoutePricesPKR: {
      'lahore-islamabad':   12000,
      'lahore-karachi':     22000,
      'lahore-skardu':      32000,
      'lahore-gilgit':      28000,
      'lahore-quetta':      28000,
      'islamabad-karachi':  22000,
      'islamabad-skardu':   28000,
      'islamabad-gilgit':   24000,
      'islamabad-chitral':  26000,
      'islamabad-quetta':   25000,
      'karachi-quetta':     22000,
      'karachi-gwadar':     20000,
      'karachi-multan':     18000,
      'karachi-skardu':     45000,
    },
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Look up a vehicle option by its category id. Returns undefined for unknown
 * ids so the caller can fall back gracefully.
 */
export function getVehicle(id: VehicleCategory | string): VehicleOption | undefined {
  return VEHICLE_OPTIONS.find((v) => v.id === id);
}

/**
 * Suggest vehicle options for a group profile, in recommended order.
 * Used by the trip creator UI to highlight "best for you" options.
 */
export function recommendForProfile(profile: GroupProfile): VehicleOption[] {
  // Vehicles whose recommendedFor includes this profile come first
  const primary = VEHICLE_OPTIONS.filter((v) => v.recommendedFor.includes(profile));
  const secondary = VEHICLE_OPTIONS.filter((v) => !v.recommendedFor.includes(profile));
  return [...primary, ...secondary];
}

/**
 * Compute total transport cost for a one-way trip.
 *
 * For flights, uses fixedRoutePricesPKR if the route is known, otherwise
 * falls back to costPerKmPKR × distance. For shared/public transport,
 * multiplies by group size (each person pays). For private vehicles, the
 * cost is independent of group size (one car, one fare).
 */
export function computeTransportCost(args: {
  vehicle: VehicleOption;
  distanceKm: number;
  groupSize: number;
  routeKey?: string;          // e.g. "lahore-skardu"
  fuelPricePerLiterPKR?: number;  // live OGRA price; falls back to a current default
}): number {
  const { vehicle, distanceKm, groupSize, routeKey, fuelPricePerLiterPKR } = args;

  // Fixed flight route price wins if available
  if (vehicle.fixedRoutePricesPKR && routeKey) {
    const normalized = routeKey.toLowerCase().split('-').sort().join('-');
    // Try both orientations of the route key
    const fixed =
      vehicle.fixedRoutePricesPKR[routeKey.toLowerCase()] ||
      vehicle.fixedRoutePricesPKR[normalized] ||
      vehicle.fixedRoutePricesPKR[routeKey.toLowerCase().split('-').reverse().join('-')];
    if (fixed) {
      return vehicle.isShared ? fixed * groupSize : fixed;
    }
  }

  // Shared / public transport (bus, shared car, flight fallback): costPerKmPKR
  // is an all-in PER-PERSON fare — fuel is already baked into the ticket — so
  // we just multiply by the number of travellers.
  if (vehicle.isShared || vehicle.isPublicTransport) {
    return Math.round(vehicle.costPerKmPKR * distanceKm * Math.max(1, groupSize));
  }

  // Private vehicle: real intercity cost = rent (driver + vehicle) + fuel + tolls.
  // This mirrors the formula the ML dataset was built on, so the deterministic
  // line-item cost and the ML prediction stay consistent. Fuel is computed from
  // the LIVE admin fuel price and the vehicle's efficiency, so the estimate
  // tracks current pump prices instead of being frozen in a single per-km rate.
  const FUEL_FALLBACK_PKR = 382;   // current OGRA petrol; admin price overrides
  const TOLL_PER_KM = 0.5;         // motorway tolls, matches dataset assumption
  const fuelPrice =
    fuelPricePerLiterPKR && fuelPricePerLiterPKR > 0 ? fuelPricePerLiterPKR : FUEL_FALLBACK_PKR;

  const rentCost = vehicle.costPerKmPKR * distanceKm;
  const fuelCost =
    vehicle.fuelEfficiencyKmPerLiter > 0
      ? (distanceKm / vehicle.fuelEfficiencyKmPerLiter) * fuelPrice
      : 0;
  const tollCost = distanceKm * TOLL_PER_KM;

  return Math.round(rentCost + fuelCost + tollCost);
}

/**
 * Compute fuel cost for private vehicles (zero for shared / public transport).
 * Useful for showing the user a transparent breakdown:
 *    "Sedan private: PKR 25/km × 600km = PKR 15,000 (≈ PKR 6,000 fuel + PKR 9,000 driver/wear)"
 */
export function computeFuelCost(args: {
  vehicle: VehicleOption;
  distanceKm: number;
  fuelPricePerLiterPKR: number;   // current OGRA price, admin-editable
}): number {
  const { vehicle, distanceKm, fuelPricePerLiterPKR } = args;
  if (vehicle.fuelEfficiencyKmPerLiter <= 0) return 0;
  const liters = distanceKm / vehicle.fuelEfficiencyKmPerLiter;
  return Math.round(liters * fuelPricePerLiterPKR);
}