// ─── Vehicle options for the trip-creator step (Day 3) ────────────────────
//
// This is the FRONTEND mirror of Backend/src/utils/vehicleOptions.ts. We
// intentionally keep both in sync rather than fetching from an API because:
//   1. The list rarely changes (admin pricing tab on Day 5 will edit costs,
//      but the option set itself is stable)
//   2. Avoiding an API call here keeps the trip-creator snappy
//   3. If the backend's catalog evolves, we only update labels/descriptions
//      here — `costPerKmPKR` and other numeric fields stay backend-only
//
// The `id` strings MUST match the backend's `VehicleCategory` type exactly,
// since they're sent as `vehicleId` in the trip generation request.

export const VEHICLES = [
  // ── Labels lead with the recognisable car model (see backend mirror) ─────
  // Single model per label on purpose: the label is sent to Gemini as the
  // "VEHICLE LOCK" and matched for transport cost. ids are unchanged.
  {
    // Cheapest private car — added for budget travellers.
    id: "hatchback_private",
    label: "Suzuki Alto (with driver)",
    icon: "🚗",
    description: "Small economy car. Cheapest private option, best for 1-3.",
    capacity: 3,
    note: "Suzuki Alto, WagonR or Cultus. Driver included. Light luggage only.",
    recommendedFor: ["solo", "couple"],
  },
  {
    id: "sedan_private",
    label: "Toyota Corolla (with driver)",
    icon: "🚘",
    description: "Comfortable sedan with driver. Best for 1-3 people.",
    capacity: 3,
    note: "Toyota Corolla, Honda City or Toyota Yaris. Driver included.",
    recommendedFor: ["solo", "couple", "business"],
  },
  {
    id: "sedan_shared",
    label: "Shared Car (inDriver / Careem)",
    icon: "🚕",
    description: "Shared rideshare-style. Cheapest road option.",
    capacity: 1,
    note: "Per-person pricing. Like Careem/inDriver intercity.",
    recommendedFor: ["solo"],
  },
  {
    id: "suv_private",
    label: "Toyota Fortuner (4x4)",
    icon: "🚙",
    description: "Spacious 4×4 — handles mountain routes.",
    capacity: 5,
    note: "Toyota Fortuner, Honda BR-V or KIA Sportage. Required for some Northern routes.",
    recommendedFor: ["family", "business"],
  },
  {
    id: "hiace_private",
    label: "Toyota Hiace (with driver)",
    icon: "🚐",
    description: "Spacious van with driver. Great for families.",
    capacity: 12,
    note: "Toyota Hiace Grand Cabin. Fits luggage for full family.",
    recommendedFor: ["family", "group"],
  },
  {
    id: "hiace_shared",
    label: "Shared Hiace Van",
    icon: "🚌",
    description: "Shared van service — common intercity option.",
    capacity: 1,
    note: "Per-person. Daewoo, Faisal Movers, Skyways operate these.",
    recommendedFor: ["solo", "couple"],
  },
  {
    id: "coaster_private",
    label: "Toyota Coaster (group)",
    icon: "🚍",
    description: "Mini-bus — best for groups of 8 or more.",
    capacity: 22,
    note: "Toyota Coaster or Higer. Includes driver and fuel.",
    recommendedFor: ["group"],
  },
  {
    id: "daewoo_business",
    label: "Daewoo Business Class",
    icon: "💺",
    description: "Premium intercity bus with reclining seats.",
    capacity: 1,
    note: "Per-person. Limited routes — Lahore-Islamabad, Lahore-Karachi, etc.",
    recommendedFor: ["solo", "couple", "business"],
  },
  {
    id: "daewoo_economy",
    label: "Daewoo / Faisal Movers Economy",
    icon: "🚏",
    description: "Reliable intercity bus, cheapest comfortable option.",
    capacity: 1,
    note: "Per-person. Frequent service on major routes.",
    recommendedFor: ["solo", "couple"],
  },
  {
    id: "flight_economy",
    label: "Flight (PIA / SereneAir / Airblue)",
    icon: "✈️",
    description: "Fastest option for long routes and Northern Areas.",
    capacity: 1,
    note: "Per-person. Required for Skardu/Gilgit/Chitral in winter.",
    recommendedFor: ["business", "couple", "family"],
  },
];

/**
 * Recommendation order: vehicles whose `recommendedFor` includes the user's
 * group profile come first. Used by VehicleSelectStep to highlight the most
 * relevant 2-3 options at the top.
 */
export const recommendForProfile = (profile) => {
  const primary = VEHICLES.filter((v) => v.recommendedFor.includes(profile));
  const secondary = VEHICLES.filter((v) => !v.recommendedFor.includes(profile));
  return [...primary, ...secondary];
};

/**
 * Map free-text group size (string from input) to a profile token.
 * 1 → solo, 2 → couple, 3-6 → family, 7+ → group.
 * Business is opt-in via a separate question, so this never returns "business".
 */
export const groupSizeToProfile = (n) => {
  const num = Number(n) || 1;
  if (num === 1) return "solo";
  if (num === 2) return "couple";
  if (num <= 6) return "family";
  return "group";
};

/**
 * Group size options shown as chips in the trip-creator step.
 */
export const GROUP_SIZE_OPTIONS = [
  { value: 1, label: "Just me" },
  { value: 2, label: "2 people" },
  { value: 4, label: "Family (3-5)" },
  { value: 8, label: "Group (6+)" },
];