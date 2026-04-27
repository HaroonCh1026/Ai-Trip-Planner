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