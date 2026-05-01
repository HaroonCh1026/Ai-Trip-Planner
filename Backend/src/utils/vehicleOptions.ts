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
  costPerKmPKR: number;              // total trip cost = costPerKmPKR × distance
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
  {
    id: 'sedan_private',
    label: 'Sedan (Private)',
    description: 'Comfortable car with driver. Best for 1-3 people.',
    capacity: 3,
    costPerKmPKR: 25,
    fuelEfficiencyKmPerLiter: 12,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['solo', 'couple', 'business'],
    note: 'Examples: Toyota Corolla, Honda City. Driver included.',
  },
  {
    id: 'sedan_shared',
    label: 'Sedan (Shared)',
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
    label: 'SUV (Private)',
    description: 'Spacious 4×4 — good for mountain routes & rough roads.',
    capacity: 5,
    costPerKmPKR: 45,
    fuelEfficiencyKmPerLiter: 9,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['family', 'business'],
    note: 'Examples: Toyota Fortuner, Honda BR-V. Required for some Northern routes.',
  },
  {
    id: 'hiace_private',
    label: 'Hiace (Private)',
    description: 'Spacious van with driver. Great for families & small groups.',
    capacity: 12,
    costPerKmPKR: 60,
    fuelEfficiencyKmPerLiter: 7,
    isShared: false,
    isPublicTransport: false,
    recommendedFor: ['family', 'group'],
    note: 'Examples: Toyota Hiace Grand Cabin. Fits luggage for full family.',
  },
  {
    id: 'hiace_shared',
    label: 'Hiace (Shared)',
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
    label: 'Coaster (Private)',
    description: 'Mini-bus — best for groups of 8 or more.',
    capacity: 22,
    costPerKmPKR: 120,
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
}): number {
  const { vehicle, distanceKm, groupSize, routeKey } = args;

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

  const baseCost = vehicle.costPerKmPKR * distanceKm;
  // Round-trip vs one-way: the AI generation flow assumes total trip
  // distance which already accounts for return leg, so we don't ×2 here.
  return vehicle.isShared ? baseCost * groupSize : baseCost;
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