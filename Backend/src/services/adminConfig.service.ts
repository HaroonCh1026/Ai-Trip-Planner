/**
 * adminConfig.service.ts — cached singleton config reader.
 *
 * The booking, gemini, and trip controllers all need to read current
 * pricing parameters (service fee %, fuel price, vehicle overrides, etc.)
 * on every request. Hitting Mongo every time would be wasteful since the
 * config rarely changes.
 *
 * Solution: in-memory cache with TTL. First read of each process loads
 * from Mongo, subsequent reads return cached value for `CACHE_TTL_MS`.
 * Writes invalidate the cache immediately so the next read picks up the
 * change.
 *
 * Defaults: if the AdminConfig document doesn't exist yet (fresh install),
 * `getConfig()` returns the sensible defaults defined here. We DON'T auto-
 * create the document just from a read — only on first explicit write.
 * This keeps the DB clean for users who never touch pricing controls.
 */

import AdminConfig, { IAdminConfig } from '../models/AdminConfig';

// Default values — must match the seed defaults on the AdminConfig schema.
// Duplicating them here so reads work even when no document exists.
export interface EffectiveConfig {
  tripServiceFeePercent: number;
  freeTripLimit: number;
  fuelPricePerLiterPKR: number;
  vehicleOverridesPKR: Record<string, number>;
  flightRouteOverridesPKR: Record<string, number>;
}

const DEFAULTS: EffectiveConfig = {
  tripServiceFeePercent: 8,
  freeTripLimit: 5,
  fuelPricePerLiterPKR: 402,
  vehicleOverridesPKR: {},
  flightRouteOverridesPKR: {},
};

// Cache state. Module-scoped so it survives across requests but not across
// process restarts — fine for a small Node deployment, you'd want Redis if
// you scaled to multiple instances.
let cached: EffectiveConfig | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;          // 30s — admin edits propagate fast enough

/**
 * Read the current effective config. Returns defaults if no document exists.
 *
 * Uses a 30-second cache. Call `invalidateConfigCache()` after writes to
 * force the next read to re-fetch from Mongo.
 */
export const getEffectiveConfig = async (): Promise<EffectiveConfig> => {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const doc = await AdminConfig.findOne({ key: 'default' }).lean();
    if (!doc) {
      cached = { ...DEFAULTS };
    } else {
      cached = {
        tripServiceFeePercent:
          typeof doc.tripServiceFeePercent === 'number' ? doc.tripServiceFeePercent : DEFAULTS.tripServiceFeePercent,
        freeTripLimit:
          typeof doc.freeTripLimit === 'number' ? doc.freeTripLimit : DEFAULTS.freeTripLimit,
        fuelPricePerLiterPKR:
          typeof doc.fuelPricePerLiterPKR === 'number' ? doc.fuelPricePerLiterPKR : DEFAULTS.fuelPricePerLiterPKR,
        vehicleOverridesPKR:
          (doc.vehicleOverridesPKR as Record<string, number>) || {},
        flightRouteOverridesPKR:
          (doc.flightRouteOverridesPKR as Record<string, number>) || {},
      };
    }
    cachedAt = now;
    return cached;
  } catch (err) {
    // Mongo read failure → return defaults rather than crashing the request.
    // Booking/AI flows still work, just on hardcoded values.
    console.warn('[adminConfig.service] Read failed, falling back to defaults:', (err as Error).message);
    return { ...DEFAULTS };
  }
};

/**
 * Read the current AdminConfig document (with `key: 'default'`).
 * Used by the admin GET endpoint to show actual stored values to the
 * admin (vs the merged effective config that fills in defaults).
 *
 * Returns null if no document exists yet. The admin UI handles this by
 * showing defaults pre-filled.
 */
export const getRawAdminConfigDoc = async (): Promise<IAdminConfig | null> => {
  return AdminConfig.findOne({ key: 'default' });
};

/**
 * Update the admin config. Upserts the singleton document.
 * Caller is responsible for validation (controller does this).
 *
 * Returns the updated document.
 */
export const updateAdminConfig = async (
  patch: Partial<EffectiveConfig>,
  updatedBy?: string
): Promise<IAdminConfig> => {
  const update: Record<string, unknown> = {};

  // Build the $set payload safely — only include keys actually provided.
  // Numbers go through Number() in case they came as strings from a form.
  if (patch.tripServiceFeePercent !== undefined) {
    update.tripServiceFeePercent = Number(patch.tripServiceFeePercent);
  }
  if (patch.freeTripLimit !== undefined) {
    update.freeTripLimit = Number(patch.freeTripLimit);
  }
  if (patch.fuelPricePerLiterPKR !== undefined) {
    update.fuelPricePerLiterPKR = Number(patch.fuelPricePerLiterPKR);
  }
  if (patch.vehicleOverridesPKR !== undefined) {
    update.vehicleOverridesPKR = sanitizeNumberMap(patch.vehicleOverridesPKR);
  }
  if (patch.flightRouteOverridesPKR !== undefined) {
    update.flightRouteOverridesPKR = sanitizeNumberMap(patch.flightRouteOverridesPKR);
  }
  if (updatedBy) {
    update.updatedBy = updatedBy;
  }

  const doc = await AdminConfig.findOneAndUpdate(
    { key: 'default' },
    { $set: update, $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, runValidators: true }
  );

  invalidateConfigCache();
  return doc;
};

/**
 * Force the next getEffectiveConfig() call to re-read from Mongo.
 * Called automatically after writes; exposed for tests + manual use.
 */
export const invalidateConfigCache = (): void => {
  cached = null;
  cachedAt = 0;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip non-numeric values + negative/NaN entries from a string→number map.
 * We never want to store garbage in the override dicts because they're
 * Mixed-typed and Mongoose won't validate per-key.
 */
function sanitizeNumberMap(input: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) {
      out[k] = n;
    }
  }
  return out;
}