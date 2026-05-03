/**
 * revenue.controller.ts — Day 5B Admin Revenue Dashboard.
 *
 * Three endpoints, all aggregations on the existing Booking collection
 * (no schema changes). Each booking row stores:
 *   - amount      = legacy total (kept for backward compat)
 *   - baseAmount  = trip's gross cost
 *   - serviceFee  = platform's earnings (8% by default, admin-tunable)
 *   - finalAmount = baseAmount + serviceFee
 *   - status      = Paid / Pending / Failed / Refunded
 *   - tripSnapshot.destination = destination at booking time
 *
 * We split metrics into TWO views consistent with marketplace reporting:
 *   1. GMV (Gross Merchandise Value) — total money flowing through platform
 *      → sum of `amount` for Paid bookings
 *   2. NET REVENUE — what we actually earn
 *      → sum of `serviceFee` for Paid bookings
 *
 * The Top Destinations list ranks by GMV (since that's what users see) but
 * also shows fee earnings per destination so admin can spot where margins
 * are best.
 *
 * Monthly trend returns last 12 months of both GMV and fee earnings so the
 * frontend can render a dual-line bar chart.
 */

import { Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';

// ─── GET /api/admin/revenue/summary ────────────────────────────────────────
// Returns headline KPIs: total GMV, total fee earnings, paid bookings count,
// average booking value, average fee per booking. All filtered to Paid status
// because Pending/Failed/Refunded shouldn't count as money in the bank.
export const getRevenueSummary = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Single aggregation pipeline — efficient even with thousands of bookings.
    // We compute everything in one Mongo round-trip rather than five queries.
    const result = await Booking.aggregate([
      { $match: { status: 'Paid' } },
      {
        $group: {
          _id: null,
          // GMV: prefer finalAmount (newer schema), fall back to amount (legacy rows)
          totalGmv:        { $sum: { $ifNull: ['$finalAmount', '$amount'] } },
          // Net revenue: serviceFee. Older rows (pre-Day-4) have $0 fee so
          // they show as $0 contribution. That's accurate, not a bug.
          totalFeeRevenue: { $sum: { $ifNull: ['$serviceFee', 0] } },
          totalBaseAmount: { $sum: { $ifNull: ['$baseAmount', 0] } },
          paidCount:       { $sum: 1 },
          avgBooking:      { $avg: { $ifNull: ['$finalAmount', '$amount'] } },
          avgFee:          { $avg: { $ifNull: ['$serviceFee', 0] } },
        },
      },
    ]);

    const summary = result[0] || {
      totalGmv: 0,
      totalFeeRevenue: 0,
      totalBaseAmount: 0,
      paidCount: 0,
      avgBooking: 0,
      avgFee: 0,
    };

    // Implied take-rate: useful sanity check — should be near 8% (the seeded
    // service fee %). If an admin lowered the % recently, this skews lower
    // because old bookings still have the old higher fee value.
    const impliedTakeRate =
      summary.totalGmv > 0 ? (summary.totalFeeRevenue / summary.totalGmv) * 100 : 0;

    // Also include total bookings count (not just Paid) for context.
    const totalBookings = await Booking.countDocuments({});

    sendSuccess(res, {
      gmv:            Math.round(summary.totalGmv),
      feeRevenue:     Math.round(summary.totalFeeRevenue),
      baseRevenue:    Math.round(summary.totalBaseAmount),
      paidBookings:   summary.paidCount,
      totalBookings,
      avgBookingValue: Math.round(summary.avgBooking || 0),
      avgFeePerBooking: Math.round(summary.avgFee || 0),
      impliedTakeRatePercent: Math.round(impliedTakeRate * 10) / 10, // 1-decimal precision
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/revenue/by-destination ─────────────────────────────────
// Top destinations by GMV. We extract destination from tripSnapshot.destination
// (snapshotted at booking time so it survives even if the trip is deleted).
//
// Returns top 10 destinations sorted by GMV descending. For each: GMV, fee
// earnings, booking count. The frontend renders this as a horizontal bar
// chart so admin can visually compare destinations.
export const getRevenueByDestination = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: 'Paid' } },
      // Group by destination. Skip rows missing the snapshot — they're
      // pre-Day-4 legacy bookings without destination info.
      {
        $group: {
          _id: { $ifNull: ['$tripSnapshot.destination', 'Unknown'] },
          gmv:        { $sum: { $ifNull: ['$finalAmount', '$amount'] } },
          feeRevenue: { $sum: { $ifNull: ['$serviceFee', 0] } },
          bookings:   { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: 'Unknown' } } }, // hide the catch-all bucket
      { $sort: { gmv: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          destination: '$_id',
          gmv:         { $round: ['$gmv', 0] },
          feeRevenue:  { $round: ['$feeRevenue', 0] },
          bookings:    1,
        },
      },
    ]);

    sendSuccess(res, { destinations: result, count: result.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/revenue/monthly ────────────────────────────────────────
// Last 12 months of revenue, bucketed by year-month. Used by the dual-bar
// chart on the dashboard (GMV bars + fee revenue bars overlaid).
//
// We always return 12 months even if some are zero, because a chart with
// gaps looks broken. Frontend fills missing months from this padded list.
export const getMonthlyRevenue = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Calculate cutoff: 12 months ago, start-of-month
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const result = await Booking.aggregate([
      {
        $match: {
          status: 'Paid',
          createdAt: { $gte: cutoff },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          gmv:        { $sum: { $ifNull: ['$finalAmount', '$amount'] } },
          feeRevenue: { $sum: { $ifNull: ['$serviceFee', 0] } },
          bookings:   { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build a month-keyed lookup so we can fill missing months with zeros.
    const lookup = new Map<string, { gmv: number; feeRevenue: number; bookings: number }>();
    for (const r of result) {
      const k = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      lookup.set(k, {
        gmv: Math.round(r.gmv),
        feeRevenue: Math.round(r.feeRevenue),
        bookings: r.bookings,
      });
    }

    // Generate the 12-month padded series (oldest → newest)
    const months: Array<{
      label: string;       // "May 2026"
      shortLabel: string;  // "May"
      year: number;
      month: number;       // 1-12
      gmv: number;
      feeRevenue: number;
      bookings: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const data = lookup.get(key) || { gmv: 0, feeRevenue: 0, bookings: 0 };
      months.push({
        label: d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }),
        shortLabel: d.toLocaleDateString('en-PK', { month: 'short' }),
        year: y,
        month: m,
        ...data,
      });
    }

    sendSuccess(res, { months });
  } catch (err) {
    next(err);
  }
};