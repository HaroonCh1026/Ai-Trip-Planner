/**
 * mlAnalytics.controller.ts — Day 5C Admin ML Analytics Dashboard.
 *
 * Three endpoints, all read-only. Surfaces the ML cost-prediction model's
 * quality so admin (and academic evaluators) can see HOW WELL it performs
 * on real user-generated trips, not just on the held-out test set.
 *
 * Endpoints:
 *   GET /api/admin/ml-analytics/meta
 *     → trained_at, dataset_rows, winning_model, R², MAE, RMSE
 *
 *   GET /api/admin/ml-analytics/predictions
 *     → array of {predicted, actual (Gemini), delta%, withinRange, destination}
 *       for every trip with mlPrediction stored. Used for scatter chart.
 *
 *   GET /api/admin/ml-analytics/by-region
 *     → average prediction error by destination region. Used for the
 *       horizontal bar chart showing where the model is most/least accurate.
 *
 * Why we compare ML predictions to Gemini's "actual" total cost:
 *   The dataset doesn't contain real bookings (we don't have enough), so
 *   we treat Gemini's totalCost as the ground truth proxy. This is what
 *   the user actually sees and pays for. The ML model's job is to validate
 *   that Gemini's number is realistic — when they diverge by >25%, the
 *   user gets warned. So "accuracy" here means "agreement with Gemini",
 *   which is itself a useful metric to expose to admin.
 */

import { Response, NextFunction } from 'express';
import Trip from '../models/Trip';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';
import { getMLMeta, isMLAvailable } from '../services/mlService';

// ─── GET /api/admin/ml-analytics/meta ──────────────────────────────────────
// Returns model metadata if the Python ML service is reachable, plus DB-side
// counts of how many trips have predictions stored (which doesn't depend on
// the service being up — those are persisted on Trip docs).
export const getMLAnalyticsMeta = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check service health (3-second timeout in mlService)
    const available = await isMLAvailable();
    let meta = null;
    if (available) {
      meta = await getMLMeta();
    }

    // Count trips with predictions stored. Doesn't depend on the ML service
    // being up — these are denormalized at trip generation time.
    const tripsWithPredictions = await Trip.countDocuments({ mlPrediction: { $exists: true, $ne: null } });

    // Aggregate avg deltaPercent + withinRange % across all stored predictions.
    // These are the "real-world" performance metrics — held-out test set
    // metrics are less useful than how the model behaves on actual user trips.
    const aggResult = await Trip.aggregate([
      { $match: { mlPrediction: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          avgAbsDeltaPercent: { $avg: { $abs: '$mlPrediction.deltaPercent' } },
          withinRangeCount:   { $sum: { $cond: ['$mlPrediction.withinRange', 1, 0] } },
          totalCount:         { $sum: 1 },
        },
      },
    ]);

    const realWorld = aggResult[0] || { avgAbsDeltaPercent: 0, withinRangeCount: 0, totalCount: 0 };
    const realWorldAccuracy =
      realWorld.totalCount > 0
        ? Math.round((realWorld.withinRangeCount / realWorld.totalCount) * 100)
        : 0;

    sendSuccess(res, {
      available,
      meta,           // null if service unreachable
      tripsWithPredictions,
      realWorld: {
        avgAbsDeltaPercent: Math.round((realWorld.avgAbsDeltaPercent || 0) * 10) / 10,
        withinRangeAccuracy: realWorldAccuracy, // % of predictions where Gemini fell in [low, high]
        sampleSize: realWorld.totalCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/ml-analytics/predictions ───────────────────────────────
// Returns all trips that have an ML prediction stored, with the predicted
// vs Gemini-actual values. Used for the scatter chart on the frontend.
//
// Capped at 500 rows so the chart doesn't lag on large datasets. For
// academic-scale data this is plenty.
export const getMLPredictions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trips = await Trip.find(
      { mlPrediction: { $exists: true, $ne: null } },
      {
        destination: 1,
        totalCost: 1,
        mlPrediction: 1,
        days: 1,
        budget: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Reshape into a flat array suitable for recharts ScatterChart.
    // Each point: x = predicted, y = actual (Gemini), with metadata for tooltip.
    //
    // Note on typing: Trip.find().lean() with a projection returns Partial<TripDoc>
    // which TS infers as `{}` for nested mixed sub-docs after `|| {}`. We declare
    // small local interfaces for the trip + prediction shape so property access
    // type-checks cleanly under strict mode without needing `any`.
    interface MLPredShape {
      predictedCostPKR?: number;
      lowPKR?: number;
      highPKR?: number;
      deltaPercent?: number;
      withinRange?: boolean;
    }
    interface TripLeanShape {
      destination?: string;
      totalCost?: number;
      mlPrediction?: MLPredShape;
      days?: number;
      budget?: number;
    }
    const points = (trips as unknown as TripLeanShape[]).map((t) => {
      const pred: MLPredShape = t.mlPrediction || {};
      return {
        predicted: Math.round(pred.predictedCostPKR || 0),
        actual:    Math.round(t.totalCost || 0),
        deltaPercent: Math.round((pred.deltaPercent || 0) * 10) / 10,
        withinRange: !!pred.withinRange,
        destination: t.destination || 'Unknown',
        days:        t.days || 0,
        budget:      t.budget || 0,
        low:         Math.round(pred.lowPKR || 0),
        high:        Math.round(pred.highPKR || 0),
      };
    });

    sendSuccess(res, { points, count: points.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/ml-analytics/by-region ─────────────────────────────────
// Average prediction error grouped by destination. Helps admin see which
// regions the model handles well vs which need more training data.
//
// Returns top 10 destinations by sample size (so we don't show noisy
// 1-trip averages — destinations need at least 2 trips to appear).
export const getMLByRegion = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await Trip.aggregate([
      { $match: { mlPrediction: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$destination',
          avgAbsDeltaPercent: { $avg: { $abs: '$mlPrediction.deltaPercent' } },
          avgPredicted:       { $avg: '$mlPrediction.predictedCostPKR' },
          avgActual:          { $avg: '$totalCost' },
          withinRangeCount:   { $sum: { $cond: ['$mlPrediction.withinRange', 1, 0] } },
          tripCount:          { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null }, tripCount: { $gte: 1 } } }, // include single-trip dests too (academic data is sparse)
      { $sort: { tripCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          destination:        '$_id',
          avgAbsDeltaPercent: { $round: ['$avgAbsDeltaPercent', 1] },
          avgPredicted:       { $round: ['$avgPredicted', 0] },
          avgActual:          { $round: ['$avgActual', 0] },
          accuracyPercent: {
            $round: [
              { $multiply: [{ $divide: ['$withinRangeCount', '$tripCount'] }, 100] },
              0,
            ],
          },
          tripCount: 1,
        },
      },
    ]);

    sendSuccess(res, { regions: result, count: result.length });
  } catch (err) {
    next(err);
  }
};