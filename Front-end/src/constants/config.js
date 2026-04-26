// constants/config.js

export const API_CONFIG = {
  // VITE_API_URL must be set to "http://localhost:5000/api" (with /api)
  // tripService and axios client both use this as the base for /trips, /auth, etc.
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
};

export const AI_CONFIG = {
  GEMINI_API_KEY: null, // handled by backend
  MODEL: 'gemini-2.5-flash',
};

export async function generateItineraryWithAI(tripData) {
  if (!tripData) throw new Error('Missing trip data');

  const token = localStorage.getItem('token');
  if (!token) throw new Error('Please login first to generate trips');

  // BASE_URL already includes /api — endpoint is /ai/generate
  const url = `${API_CONFIG.BASE_URL}/ai/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      origin:      tripData.origin,
      destination: tripData.destination,
      days:        parseInt(tripData.days),
      startDate:   tripData.startDate,
      budget:      parseInt(tripData.budget),
      preferences: tripData.preferences || 'Architecture, Culture, Logistics',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) throw new Error('Session expired. Please login again.');
    if (res.status === 403) {
      // Free trip limit reached — surface-friendly message with upgrade prompt
      throw new Error(
        data.message ||
        'You have used all 5 free trips. Please upgrade to Pro for unlimited planning.'
      );
    }
    if (res.status === 429) throw new Error('Rate limit reached. Please try again later.');
    if (res.status === 502) throw new Error('AI service temporarily unavailable. Please try again.');

    throw new Error(data.message || 'Failed to generate itinerary');
  }

  const result = await res.json();
  return result.data;
}
