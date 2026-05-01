import mongoose, { Schema, Document } from 'mongoose';

/**
 * CachedRoute — persistent cache of distance & travel-time data between two
 * Pakistani cities.
 *
 * Geoapify's free tier allows us to cache and reuse responses indefinitely.
 * That's exactly what this model is for: every time we look up a new route,
 * we save it here so subsequent users for the same route get instant
 * results without burning API credits.
 *
 * Cache keys are normalized lowercase city names sorted alphabetically, so
 * "Lahore → Skardu" and "Skardu → Lahore" share the same cached entry
 * (travel time is symmetric in physical reality).
 *
 * Source field tracks where the data came from:
 *   - 'geoapify'  — fetched from Geoapify Routing API (highest fidelity)
 *   - 'curated'   — hand-curated for top routes (Geoapify was offline)
 *   - 'dataset'   — estimated from the median of our training dataset
 *                   (lowest confidence — only distance, no real drive time)
 *
 * The TTL index makes Geoapify-sourced entries auto-expire after 90 days,
 * so we periodically refresh in case roads change. Curated and dataset
 * entries don't expire (they're authoritative for fallback).
 */

export interface ICachedRoute extends Document {
  cacheKey: string;          // normalized "city_a|city_b" (sorted alphabetically)
  origin: string;            // original casing for display
  destination: string;       // original casing for display
  kmRoad: number;            // road distance
  hoursRoad: number;         // estimated drive time
  flightAvailable: boolean;  // does the route have scheduled flights?
  hoursFlight?: number;      // gate-to-gate flight time (if applicable)
  source: 'geoapify' | 'curated' | 'dataset';
  fetchedAt: Date;           // when we last refreshed this entry
  expiresAt?: Date;          // optional TTL — only set for geoapify entries
}

const cachedRouteSchema = new Schema<ICachedRoute>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    kmRoad: { type: Number, required: true, min: 0 },
    hoursRoad: { type: Number, required: true, min: 0 },
    flightAvailable: { type: Boolean, default: false },
    hoursFlight: { type: Number },
    source: {
      type: String,
      enum: ['geoapify', 'curated', 'dataset'],
      required: true,
    },
    fetchedAt: { type: Date, default: Date.now },
    // TTL index: when expiresAt is set, Mongo auto-deletes the document
    // after that timestamp passes. Curated/dataset entries leave this unset
    // so they live forever as the safety-net fallback.
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

const CachedRoute = mongoose.model<ICachedRoute>('CachedRoute', cachedRouteSchema);
export default CachedRoute;