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
