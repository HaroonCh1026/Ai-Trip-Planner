import mongoose, { Schema } from 'mongoose';
import { ITrip } from '../types';

// ─── Activity sub-schema ───────────────────────────────────────────────────
// Matches: { time, type, name, location, duration, cost, tips }
const activitySchema = new Schema(
  {
    time: { type: String, default: '' },       // "09:00 AM"
    type: { type: String, default: 'activity' }, // "activity" | "restaurant" | "hotel"
    name: { type: String, default: '' },
    location: { type: String, default: '' },
    duration: { type: String, default: '' },   // "2.5 hours"
    cost: { type: Number, default: 0 },         // PKR
    tips: { type: String, default: '' },
  },
  { _id: false }
);

// ─── Hotel sub-schema ──────────────────────────────────────────────────────
// Matches: { name, location, price, rating, why }
const hotelSchema = new Schema(
  {
    name: { type: String, default: '' },
    location: { type: String, default: '' },
    price: { type: String, default: '' },       // "PKR 35,000/night"
    rating: { type: Number, default: 0 },
    why: { type: String, default: '' },
  },
  { _id: false }
);

// ─── Itinerary day sub-schema ──────────────────────────────────────────────
// Matches: { day, title, activities[], hotel, dailyCost }
const itineraryDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, default: '' },
    activities: [activitySchema],
    hotel: { type: hotelSchema, default: () => ({}) },
    dailyCost: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Refinement sub-schema (Round 7) ──────────────────────────────────────
// Each refinement records the user's instruction and the resulting itinerary
// snapshot, so users can see the evolution of their trip and (future feature)
// roll back to a previous version. Append-only.
const refinementSchema = new Schema(
  {
    instruction: { type: String, required: true, maxlength: 500 },
    // Snapshot of the itinerary AFTER this refinement was applied.
    // Stored as flexible Mixed type since the AI may add new top-level fields
    // over time and we don't want strict Mongoose validation to reject them.
    itinerarySnapshot: { type: Schema.Types.Mixed },
    summary: { type: String, default: '' },
    totalCost: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true } // give each refinement its own _id so future rollback can reference it
);

// ─── ML cost prediction sub-schema (Day 2) ─────────────────────────────────
// Snapshot of what the trained Pakistan-travel cost model predicted for this
// trip at the moment Gemini generated it. We store it on the trip itself so
// that:
//   1. The itinerary view can render "based on similar trips" without re-
//      hitting the Python service every page load
//   2. The admin analytics tab can compare AI estimates vs ML predictions
//      vs actual booking values across all historical trips
//   3. We have a permanent record even if the model is later retrained or
//      the ML service goes offline
//
// Fields are optional — if the ML service was down at generation time, this
// whole subdocument is simply absent and the UI falls back to AI estimate
// only.
const mlPredictionSchema = new Schema(
  {
    predictedCostPKR: { type: Number, required: true },   // model's point estimate
    lowPKR: { type: Number, required: true },             // predictedCost - rmse
    highPKR: { type: Number, required: true },            // predictedCost + rmse
    rmsePKR: { type: Number, default: 0 },                // model's test-set RMSE
    aiEstimatePKR: { type: Number, default: 0 },          // what Gemini claimed
    deltaPercent: { type: Number, default: 0 },           // (ai - predicted) / predicted * 100
    withinRange: { type: Boolean, default: true },        // is AI estimate within [low, high]?
    confidenceLabel: {                                    // human-readable verdict
      type: String,
      enum: ['accurate', 'slightly_off', 'unrealistic'],
      default: 'accurate',
    },
    predictedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Trip schema ───────────────────────────────────────────────────────────
const tripSchema = new Schema<ITrip>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Chatbot-collected fields (CHATBOT_QUESTIONS ids) ──────────────────
    destination: { type: String, required: [true, 'Destination is required'], trim: true },
    origin: { type: String, required: [true, 'Origin is required'], trim: true },
    days: { type: Number, required: true, min: 1, max: 30 },
    budget: { type: Number, required: true, min: 0 },
    startDate: { type: String, required: true },   // "YYYY-MM-DD"
    dates: { type: String, default: '' },          // "Jun 10 – Jun 16, 2025"
    image: { type: String, default: '' },          // Unsplash URL

    // ── AI-generated fields ───────────────────────────────────────────────
    itinerary: [itineraryDaySchema],
    summary: { type: String, default: '' },
    totalCost: { type: Number, default: 0 },       // totalEstimatedCost from Gemini
    tips: [{ type: String }],
    bestTimeToVisit: { type: String, default: '' },
    currency: { type: String, default: 'Pakistani Rupee (PKR)' },
    language: { type: String, default: 'Urdu/English' },
    emergencyNumbers: { type: String, default: '15 (Police), 1122 (Medical)' },

    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    // ── Refinement history (Round 7) ──────────────────────────────────────
    // Append-only list of every refinement made to this trip. The CURRENT
    // active itinerary lives in `itinerary` above (we replace it on each
    // refinement). This array is the audit trail — most recent last.
    refinements: { type: [refinementSchema], default: [] },

    // ── ML cost prediction snapshot (Day 2) ────────────────────────────────
    // Set when Gemini generates the trip. Optional — if ML service was offline
    // at generation time, this is simply absent.
    mlPrediction: { type: mlPredictionSchema, default: undefined },

    // ── Feasibility report (Day 3) ─────────────────────────────────────────
    // Set when the post-Gemini validator caught one or more timing/distance
    // issues with the AI-generated itinerary. Stored as Mixed because the
    // shape may evolve as we add new validator types and we don't want
    // Mongoose strictness to reject legitimate fields. Optional — most trips
    // pass validation cleanly and this field is absent.
    feasibility: { type: Schema.Types.Mixed, default: undefined },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['__v'];
        return ret;
      },
    },
  }
);

const Trip = mongoose.model<ITrip>('Trip', tripSchema);
export default Trip;