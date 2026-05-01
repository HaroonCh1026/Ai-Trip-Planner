// src/services/bookingService.js
//
// Day 4: client for trip-booking simulation endpoints. Distinct from the
// existing payment flow (Stripe) — this one is for booking the actual TRIP
// with the platform's 8% service fee.
//
// Endpoint contract:
//   POST /api/bookings/trip      → create a booking for a saved trip
//   GET  /api/bookings/:id       → fetch a booking by id (for confirmation page)
//
// All requests use the existing JWT auth flow.

import { API_CONFIG } from '../constants/config';

const BASE = API_CONFIG.BASE_URL;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please login first');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const bookingService = {
  /**
   * Book a saved trip. Adds the 8% service fee server-side, returns the
   * persisted Booking document with bookingId, baseAmount, serviceFee,
   * finalAmount, and tripSnapshot.
   */
  async bookTrip(tripId) {
    if (!tripId) throw new Error('Missing tripId');
    const res = await fetch(`${BASE}/bookings/trip`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tripId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `Booking failed (HTTP ${res.status})`);
    }
    return data?.data?.booking || data?.booking;
  },

  /**
   * Fetch a single booking by id. Used by the confirmation page to render
   * the receipt. Scoped to the current user — backend enforces ownership.
   */
  async getBookingById(bookingId) {
    if (!bookingId) throw new Error('Missing bookingId');
    const res = await fetch(`${BASE}/bookings/${bookingId}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `Booking lookup failed (HTTP ${res.status})`);
    }
    return data?.data?.booking || data?.booking;
  },
};