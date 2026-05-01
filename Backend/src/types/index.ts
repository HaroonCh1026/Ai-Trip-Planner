import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  bio: string;
  avatar: string;
  role: 'user' | 'admin';
  status: 'Active' | 'Blocked';
  plan: 'free' | 'pro';
  tripsUsed: number;
  provider: 'email' | 'Google' | 'Apple';
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  
  // ─── Password Reset (Round 6) ────────────────────────────────────────────
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  // ─── Stripe Pro Subscription (NEW - Round 8) ────────────────────────────
  planExpires?: Date | null;
  
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IActivity {
  time: string;
  type: string;
  name: string;
  location: string;
  duration?: string;
  cost?: number;
  tips?: string;
}

export interface IHotel {
  name: string;
  location: string;
  price: string;
  rating: number;
  why: string;
}

export interface IItineraryDay {
  day: number;
  title: string;
  activities: IActivity[];
  hotel: IHotel;
  dailyCost: number;
}

// ─── Round 7: refinement history entry ──────────────────────────────────────
export interface ITripRefinement {
  _id?: Types.ObjectId;
  instruction: string;
  itinerarySnapshot?: unknown; // Mixed in Mongoose; opaque on the type side
  summary?: string;
  totalCost?: number;
  createdAt: Date;
}

// Day 2: ML cost prediction snapshot persisted on each Trip
export interface IMLPrediction {
  predictedCostPKR: number;
  lowPKR: number;
  highPKR: number;
  rmsePKR?: number;
  aiEstimatePKR?: number;
  deltaPercent?: number;
  withinRange?: boolean;
  confidenceLabel?: 'accurate' | 'slightly_off' | 'unrealistic';
  predictedAt?: Date;
}

// Day 3: feasibility report from validator. Persisted as Mixed in Mongoose
// (shape may evolve as we add new validator types) but typed here so the
// rest of the codebase has a contract to work against.
export interface IFeasibilityViolation {
  day: number;
  severity: 'warning' | 'critical';
  type: 'insufficient_travel_time' | 'too_many_distant_locations' | 'overpacked_day';
  message: string;
  details?: {
    fromLocation?: string;
    toLocation?: string;
    requiredHours?: number;
    availableHours?: number;
  };
}

export interface IFeasibility {
  feasible: boolean;
  violations: IFeasibilityViolation[];
  warningCount: number;
  criticalCount: number;
}

export interface ITrip extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  destination: string;
  origin: string;
  days: number;
  budget: number;
  startDate: string;
  dates: string;
  image: string;
  itinerary: IItineraryDay[];
  summary: string;
  totalCost: number;
  tips: string[];
  bestTimeToVisit: string;
  currency: string;
  language: string;
  emergencyNumbers?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  // ─── Round 7: append-only refinement history ──────────────────────────────
  refinements: ITripRefinement[];
  // ─── Day 2: ML cost prediction snapshot ──────────────────────────────────
  mlPrediction?: IMLPrediction;
  // ─── Day 3: feasibility validator report (only set when violations found)
  feasibility?: IFeasibility;
  createdAt: Date;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  bookingId: string;
  userId: Types.ObjectId;
  tripId: Types.ObjectId;
  amount: number;
  status: 'Paid' | 'Pending' | 'Cancelled';
  planType?: string;
  // Day 4: trip booking simulation fields. Optional because existing
  // subscription bookings won't have these set.
  bookingType?: 'trip' | 'subscription';
  baseAmount?: number;
  serviceFee?: number;
  finalAmount?: number;
  tripSnapshot?: unknown; // Mixed in Mongoose; opaque on the type side
  vehicleId?: string;
  groupSize?: number;
  createdAt: Date;
}

export interface IBlog extends Document {
  _id: Types.ObjectId;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  readTime: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export interface TripGenerationInput {
  origin: string;
  destination: string;
  days: number | string;
  startDate: string;
  budget: number | string;
  preferences?: string;
  // Day 3: optional fields collected by the new vehicle-selection step.
  // Backwards-compatible — older clients that don't send these still work,
  // and the gemini service falls back to sensible defaults.
  vehicleId?: string;            // e.g. 'sedan_private', 'flight_economy', 'hiace_private'
  groupSize?: number | string;   // 1, 2, 4, etc.
}

export interface GeminiItineraryResponse {
  summary: string;
  totalEstimatedCost: number;
  days: IItineraryDay[];
  tips: string[];
  bestTimeToVisit: string;
  currency: string;
  language: string;
  emergencyNumbers?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}