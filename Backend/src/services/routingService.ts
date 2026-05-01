/**
 * routingService.ts — hybrid distance & travel-time lookup for Pakistani routes.
 *
 * Three-tier strategy (each falls back to the next if it returns no data):
 *
 *   1. Geoapify Routing API   — primary source. Real road distance & time
 *                               for any pair of cities Geoapify knows about.
 *                               Cached in Mongo (CachedRoute) so we only
 *                               hit the API once per unique route.
 *
 *   2. Curated matrix         — hand-curated data for the top 30 most-traveled
 *                               Pakistani routes. Fast, accurate, always
 *                               available even if Geoapify is offline.
 *                               Includes flight availability (Geoapify
 *                               doesn't know about Pakistani domestic flights).
 *
 *   3. Dataset estimation     — last-resort fallback that uses the median
 *                               Distance(km) value from our training dataset
 *                               for the (origin, destination) pair, with
 *                               drive time computed from a Pakistan-average
 *                               road speed of 40 km/h.
 *
 * Returns null only when ALL THREE tiers fail — in which case the caller
 * (feasibility validator) should silently skip the check rather than
 * fabricate a warning.
 *
 * The service is async because Geoapify lookups + Mongo cache reads are
 * I/O bound. Average call time:
 *   - Cached route:        ~5 ms (Mongo hit)
 *   - First Geoapify call: ~300-500 ms
 *   - Curated fallback:    <1 ms (in-memory)
 *   - Dataset fallback:    ~10 ms (CSV scan, lazy-loaded once at boot)
 */

import fs from 'fs';
import path from 'path';
import config from '../config/config';
import CachedRoute from '../models/CachedRoute';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RouteData {
  kmRoad: number;
  hoursRoad: number;
  flightAvailable: boolean;
  hoursFlight?: number;
  source: 'geoapify' | 'curated' | 'dataset';
}

// ─── Tier 2: Curated matrix ─────────────────────────────────────────────────
// Hand-curated data for the top 30 most-traveled Pakistani routes. Used
// as a safety net when Geoapify is offline or rate-limited, AND as the
// authoritative source for flight availability (Geoapify doesn't know
// which routes have Pakistani domestic flights).

interface CuratedRoute {
  kmRoad: number;
  hoursRoad: number;
  flightAvailable: boolean;
  hoursFlight?: number;
}

const CURATED: Record<string, Record<string, CuratedRoute>> = {
  lahore: {
    islamabad:    { kmRoad: 380,  hoursRoad: 4.5,  flightAvailable: true,  hoursFlight: 2 },
    karachi:      { kmRoad: 1212, hoursRoad: 18,   flightAvailable: true,  hoursFlight: 3.5 },
    multan:       { kmRoad: 350,  hoursRoad: 5,    flightAvailable: false },
    faisalabad:   { kmRoad: 130,  hoursRoad: 2,    flightAvailable: false },
    peshawar:     { kmRoad: 480,  hoursRoad: 6.5,  flightAvailable: false },
    murree:       { kmRoad: 430,  hoursRoad: 6,    flightAvailable: false },
    naran:        { kmRoad: 600,  hoursRoad: 11,   flightAvailable: false },
    skardu:       { kmRoad: 1287, hoursRoad: 22,   flightAvailable: true,  hoursFlight: 4 },
    gilgit:       { kmRoad: 880,  hoursRoad: 18,   flightAvailable: true,  hoursFlight: 4 },
    swat:         { kmRoad: 555,  hoursRoad: 8,    flightAvailable: false },
    chitral:      { kmRoad: 750,  hoursRoad: 14,   flightAvailable: true,  hoursFlight: 4 },
    quetta:       { kmRoad: 990,  hoursRoad: 14,   flightAvailable: true,  hoursFlight: 3.5 },
  },
  islamabad: {
    rawalpindi:   { kmRoad: 15,   hoursRoad: 0.5,  flightAvailable: false },
    karachi:      { kmRoad: 1400, hoursRoad: 22,   flightAvailable: true,  hoursFlight: 3.5 },
    peshawar:     { kmRoad: 175,  hoursRoad: 2.5,  flightAvailable: false },
    murree:       { kmRoad: 65,   hoursRoad: 1.5,  flightAvailable: false },
    naran:        { kmRoad: 270,  hoursRoad: 7,    flightAvailable: false },
    skardu:       { kmRoad: 740,  hoursRoad: 16,   flightAvailable: true,  hoursFlight: 2 },
    gilgit:       { kmRoad: 470,  hoursRoad: 12,   flightAvailable: true,  hoursFlight: 2 },
    chilas:       { kmRoad: 380,  hoursRoad: 9,    flightAvailable: false },
    swat:         { kmRoad: 270,  hoursRoad: 5,    flightAvailable: false },
    chitral:      { kmRoad: 410,  hoursRoad: 11,   flightAvailable: true,  hoursFlight: 2 },
    quetta:       { kmRoad: 800,  hoursRoad: 12,   flightAvailable: true,  hoursFlight: 2 },
    abbottabad:   { kmRoad: 110,  hoursRoad: 2.5,  flightAvailable: false },
    multan:       { kmRoad: 580,  hoursRoad: 8,    flightAvailable: true,  hoursFlight: 2 },
  },
  karachi: {
    hyderabad:    { kmRoad: 165,  hoursRoad: 2.5,  flightAvailable: false },
    quetta:       { kmRoad: 690,  hoursRoad: 11,   flightAvailable: true,  hoursFlight: 2 },
    gwadar:       { kmRoad: 635,  hoursRoad: 10,   flightAvailable: true,  hoursFlight: 2 },
    multan:       { kmRoad: 850,  hoursRoad: 12,   flightAvailable: true,  hoursFlight: 2 },
    skardu:       { kmRoad: 2150, hoursRoad: 36,   flightAvailable: true,  hoursFlight: 4 },
  },
  skardu: {
    khaplu:       { kmRoad: 100,  hoursRoad: 3,    flightAvailable: false },
    shigar:       { kmRoad: 35,   hoursRoad: 1.5,  flightAvailable: false },
    deosai:       { kmRoad: 80,   hoursRoad: 4,    flightAvailable: false },
    gilgit:       { kmRoad: 165,  hoursRoad: 5,    flightAvailable: false },
  },
  hunza: {
    gilgit:       { kmRoad: 100,  hoursRoad: 2.5,  flightAvailable: false },
    'attabad lake': { kmRoad: 25, hoursRoad: 0.75, flightAvailable: false },
    sost:         { kmRoad: 85,   hoursRoad: 2.5,  flightAvailable: false },
    'khunjerab pass': { kmRoad: 165, hoursRoad: 5, flightAvailable: false },
  },
  naran: {
    'saif-ul-malook': { kmRoad: 12, hoursRoad: 1,  flightAvailable: false },
    babusar:      { kmRoad: 70,   hoursRoad: 3.5,  flightAvailable: false },
    balakot:      { kmRoad: 80,   hoursRoad: 3,    flightAvailable: false },
  },
};

// City name aliases — maps colloquial spellings & nearby attractions to
// matrix keys. e.g. "Saif-ul-Malook" → "Naran" since the lake is reached
// via Naran. Tried after raw lookup but before falling through to lower tiers.
const ALIASES: Record<string, string> = {
  'saif-ul-malook': 'naran',
  'lake saif-ul-malook': 'naran',
  'karimabad': 'hunza',
  'aliabad': 'hunza',
  'attabad': 'hunza',
  'attabad lake': 'hunza',
  'fairy meadows': 'gilgit',
  'nanga parbat': 'gilgit',
  'kalash': 'chitral',
  'kalash valleys': 'chitral',
  'shigar': 'skardu',
  'khaplu': 'skardu',
  'deosai': 'skardu',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lowercase, trim, strip ", Country" suffixes, resolve aliases. */
function normalize(name: string): string {
  if (!name) return '';
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return ALIASES[cleaned] || cleaned;
}

/** Build the symmetric cache key. "Lahore-Skardu" and "Skardu-Lahore" → same key. */
function makeCacheKey(a: string, b: string): string {
  return [normalize(a), normalize(b)].sort().join('|');
}

// ─── Tier 1: Geoapify ───────────────────────────────────────────────────────

interface GeoapifyGeocodeResult {
  features: Array<{
    properties: {
      lat: number;
      lon: number;
      country?: string;
    };
  }>;
}

interface GeoapifyRouteResult {
  features: Array<{
    properties: {
      distance: number;          // meters
      time: number;              // seconds
    };
  }>;
}

/**
 * Geocode a city name to lat/lng using Geoapify Geocoding API. Biased to
 * Pakistan to prevent ambiguous matches (e.g. "Lahore, Pakistan" not
 * "Lahore, India").
 */
async function geocodeCity(name: string): Promise<{ lat: number; lon: number } | null> {
  if (!config.geoapify.apiKey) return null;
  try {
    const url =
      `https://api.geoapify.com/v1/geocode/search` +
      `?text=${encodeURIComponent(name + ', Pakistan')}` +
      `&filter=countrycode:pk` +
      `&limit=1` +
      `&apiKey=${config.geoapify.apiKey}`;
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return null;
    const data = (await res.json()) as GeoapifyGeocodeResult;
    const f = data.features?.[0];
    if (!f) return null;
    return { lat: f.properties.lat, lon: f.properties.lon };
  } catch (err) {
    console.warn(`[routingService] Geocode failed for "${name}": ${(err as Error).message}`);
    return null;
  }
}

/**
 * Compute driving route between two lat/lng points via Geoapify Routing API.
 * Returns distance in meters and time in seconds.
 */
async function geoapifyRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<{ km: number; hours: number } | null> {
  if (!config.geoapify.apiKey) return null;
  try {
    const waypoints = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
    const url =
      `https://api.geoapify.com/v1/routing` +
      `?waypoints=${waypoints}` +
      `&mode=drive` +
      `&apiKey=${config.geoapify.apiKey}`;
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) return null;
    const data = (await res.json()) as GeoapifyRouteResult;
    const props = data.features?.[0]?.properties;
    if (!props) return null;
    return {
      km: Math.round(props.distance / 1000),
      hours: +(props.time / 3600).toFixed(1),
    };
  } catch (err) {
    console.warn(`[routingService] Routing failed: ${(err as Error).message}`);
    return null;
  }
}

/** Fetch wrapper with AbortController-based timeout. */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Tier 1 entry point: Geoapify with caching. Returns null on any failure. */
async function tryGeoapify(origin: string, destination: string): Promise<RouteData | null> {
  const a = normalize(origin);
  const b = normalize(destination);

  // Geocode both cities
  const [from, to] = await Promise.all([geocodeCity(a), geocodeCity(b)]);
  if (!from || !to) return null;

  const route = await geoapifyRoute(from, to);
  if (!route) return null;

  // Geoapify doesn't know flight availability — defer to curated matrix
  // for that. Most non-curated routes don't have flights anyway.
  const curated = lookupCurated(a, b);
  return {
    kmRoad: route.km,
    hoursRoad: route.hours,
    flightAvailable: curated?.flightAvailable ?? false,
    hoursFlight: curated?.hoursFlight,
    source: 'geoapify',
  };
}

// ─── Tier 2: Curated lookup ─────────────────────────────────────────────────

function lookupCurated(a: string, b: string): CuratedRoute | null {
  if (CURATED[a]?.[b]) return CURATED[a][b];
  if (CURATED[b]?.[a]) return CURATED[b][a];
  return null;
}

function tryCurated(origin: string, destination: string): RouteData | null {
  const a = normalize(origin);
  const b = normalize(destination);
  const route = lookupCurated(a, b);
  if (!route) return null;
  return { ...route, source: 'curated' };
}

// ─── Tier 3: Dataset estimation ─────────────────────────────────────────────
// Lazy-loaded on first use. Reads pakistan_travel_dataset.csv and indexes by
// (origin, destination) → median distance. We don't have drive time in the
// dataset, so we compute it from km using Pakistan's blended-average road
// speed of 40 km/h.

interface DatasetIndex {
  byPair: Map<string, number>;        // "origin|destination" → median km
  byDest: Map<string, number>;         // destination → median km from anywhere
  loaded: boolean;
  loadedAt?: Date;
}

const DATASET: DatasetIndex = {
  byPair: new Map(),
  byDest: new Map(),
  loaded: false,
};

function loadDatasetIndex(): void {
  if (DATASET.loaded) return;

  const csvPath = path.resolve(__dirname, '../../../ML/data/pakistan_travel_dataset.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`[routingService] Dataset not found at ${csvPath} — Tier 3 fallback disabled`);
    DATASET.loaded = true; // mark as loaded so we don't keep retrying
    return;
  }

  try {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    if (lines.length < 2) {
      DATASET.loaded = true;
      return;
    }
    const header = lines[0].split(',');
    const idxOrigin = header.indexOf('Origin city');
    const idxDest = header.indexOf('Destination');
    const idxDist = header.indexOf('Distance (km)');
    if (idxOrigin < 0 || idxDest < 0 || idxDist < 0) {
      console.warn('[routingService] Dataset missing expected columns');
      DATASET.loaded = true;
      return;
    }

    // Aggregate by pair and by destination
    const pairAgg = new Map<string, number[]>();
    const destAgg = new Map<string, number[]>();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < header.length) continue;
      const origin = normalize(parts[idxOrigin]);
      const dest = normalize(parts[idxDest]);
      const km = parseInt(parts[idxDist], 10);
      if (!origin || !dest || !Number.isFinite(km) || km <= 0) continue;
      const pairKey = [origin, dest].sort().join('|');
      if (!pairAgg.has(pairKey)) pairAgg.set(pairKey, []);
      pairAgg.get(pairKey)!.push(km);
      if (!destAgg.has(dest)) destAgg.set(dest, []);
      destAgg.get(dest)!.push(km);
    }

    const median = (arr: number[]): number => {
      const sorted = [...arr].sort((x, y) => x - y);
      return sorted[Math.floor(sorted.length / 2)];
    };
    for (const [k, vals] of pairAgg) DATASET.byPair.set(k, median(vals));
    for (const [k, vals] of destAgg) DATASET.byDest.set(k, median(vals));

    DATASET.loaded = true;
    DATASET.loadedAt = new Date();
    console.log(
      `[routingService] Dataset index loaded: ${DATASET.byPair.size} city pairs, ` +
      `${DATASET.byDest.size} destinations`
    );
  } catch (err) {
    console.warn(`[routingService] Dataset load failed: ${(err as Error).message}`);
    DATASET.loaded = true; // don't keep retrying
  }
}

function tryDataset(origin: string, destination: string): RouteData | null {
  loadDatasetIndex();
  const a = normalize(origin);
  const b = normalize(destination);
  const pairKey = [a, b].sort().join('|');

  // Prefer exact-pair median
  let km = DATASET.byPair.get(pairKey);
  // Fall back to destination-median if the specific pair isn't in dataset
  if (!km) km = DATASET.byDest.get(b) ?? DATASET.byDest.get(a);
  if (!km) return null;

  return {
    kmRoad: km,
    hoursRoad: +(km / 40).toFixed(1),  // Pakistan blended road speed
    flightAvailable: false,             // we don't know from dataset alone
    source: 'dataset',
  };
}

// ─── Cache layer ────────────────────────────────────────────────────────────

async function readCache(cacheKey: string): Promise<RouteData | null> {
  try {
    const doc = await CachedRoute.findOne({ cacheKey }).lean();
    if (!doc) return null;
    return {
      kmRoad: doc.kmRoad,
      hoursRoad: doc.hoursRoad,
      flightAvailable: doc.flightAvailable,
      hoursFlight: doc.hoursFlight,
      source: doc.source,
    };
  } catch (err) {
    // Mongo failures are not fatal — fall through to live lookup.
    console.warn(`[routingService] Cache read failed: ${(err as Error).message}`);
    return null;
  }
}

async function writeCache(args: {
  cacheKey: string;
  origin: string;
  destination: string;
  data: RouteData;
}): Promise<void> {
  const { cacheKey, origin, destination, data } = args;
  try {
    // Geoapify entries TTL after 90 days; curated/dataset live forever.
    const expiresAt =
      data.source === 'geoapify'
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        : undefined;
    await CachedRoute.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        origin,
        destination,
        kmRoad: data.kmRoad,
        hoursRoad: data.hoursRoad,
        flightAvailable: data.flightAvailable,
        hoursFlight: data.hoursFlight,
        source: data.source,
        fetchedAt: new Date(),
        expiresAt,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-fatal: even if we can't cache, the caller still got data.
    console.warn(`[routingService] Cache write failed: ${(err as Error).message}`);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up route data between two cities. Hybrid three-tier strategy:
 *
 *   1. Read from cache → if hit and not stale, return immediately
 *   2. Try Geoapify (with caching of result)
 *   3. Try curated matrix (with caching of result)
 *   4. Try dataset estimation (with caching of result)
 *   5. Return null if all four tiers fail
 *
 * The caller (typically feasibility validator) should treat null as "we
 * don't know — skip this check rather than fabricate a warning."
 */
export async function getRoute(origin: string, destination: string): Promise<RouteData | null> {
  if (!origin || !destination) return null;
  const a = normalize(origin);
  const b = normalize(destination);
  if (!a || !b || a === b) return null;

  const cacheKey = makeCacheKey(origin, destination);

  // Tier 0: cache
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  // Tier 1: Geoapify (only if API key configured)
  if (config.geoapify.apiKey) {
    const geo = await tryGeoapify(origin, destination);
    if (geo) {
      await writeCache({ cacheKey, origin, destination, data: geo });
      return geo;
    }
  }

  // Tier 2: curated
  const curated = tryCurated(origin, destination);
  if (curated) {
    await writeCache({ cacheKey, origin, destination, data: curated });
    return curated;
  }

  // Tier 3: dataset
  const ds = tryDataset(origin, destination);
  if (ds) {
    await writeCache({ cacheKey, origin, destination, data: ds });
    return ds;
  }

  return null;
}

/**
 * Returns the FASTEST realistic travel time between two cities (flight if
 * available, otherwise road). Used by the feasibility validator to check
 * whether Gemini's day-by-day plan is physically possible.
 */
export async function getFastestTravelHours(
  origin: string,
  destination: string
): Promise<number | null> {
  const route = await getRoute(origin, destination);
  if (!route) return null;
  if (route.flightAvailable && route.hoursFlight) {
    return Math.min(route.hoursRoad, route.hoursFlight);
  }
  return route.hoursRoad;
}

/**
 * Human-readable description for Gemini prompt enrichment. Used to inject
 * realistic travel constraints into the AI's planning context.
 */
export async function describeRoute(origin: string, destination: string): Promise<string | null> {
  const route = await getRoute(origin, destination);
  if (!route) return null;
  const parts = [`${route.kmRoad}km by road (~${route.hoursRoad} hours)`];
  if (route.flightAvailable && route.hoursFlight) {
    parts.push(`${route.hoursFlight} hours by flight`);
  }
  return `${origin} to ${destination}: ${parts.join(' or ')}`;
}