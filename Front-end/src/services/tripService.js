// src/services/tripService.js
import { API_CONFIG } from '../constants/config';

const BASE = API_CONFIG.BASE_URL; // e.g. "http://localhost:5000/api"  — NO trailing slash

const authHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please login first');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const tripService = {
  // ── Save a new trip ────────────────────────────────────────────────────────
  async saveTrip(tripData) {
    const res = await fetch(`${BASE}/trips`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(tripData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save trip');
    }
    const result = await res.json();
    return result.data.trip;
  },

  // ── Get all trips for current user ────────────────────────────────────────
  async getUserTrips() {
    const res = await fetch(`${BASE}/trips`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trips');
    const result = await res.json();
    return result.data.trips;
  },

  // ── Get a single trip by ID ───────────────────────────────────────────────
  async getTripById(tripId) {
    const res = await fetch(`${BASE}/trips/${tripId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trip');
    const result = await res.json();
    return result.data.trip;
  },

  // ── Update trip status ────────────────────────────────────────────────────
  async updateTripStatus(tripId, status) {
    const res = await fetch(`${BASE}/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update trip status');
    const result = await res.json();
    return result.data.trip;
  },

  // ── Delete a trip ─────────────────────────────────────────────────────────
  // BUG FIX: was `${BASE}/api/trips/${tripId}` (double /api/) — now correct
  async deleteTrip(tripId) {
    const res = await fetch(`${BASE}/trips/${tripId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete trip');
    return res.json();
  },

  // ── Support ticket: submit (works for logged-in or guest) ─────────────────
  async submitSupportTicket({ name, email, category, message }) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}/support`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, email, category, message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to submit ticket');
    }
    return res.json();
  },

  // ── Support ticket: get my tickets ────────────────────────────────────────
  async getMyTickets() {
    const res = await fetch(`${BASE}/support/my`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to fetch support tickets');
    const result = await res.json();
    return result.data.tickets;
  },
};
