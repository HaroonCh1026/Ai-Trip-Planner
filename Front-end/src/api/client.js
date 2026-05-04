// src/api/client.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — redirect to login for authenticated routes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/social") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Password Reset API Functions ─────────────────────────────────────────
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post("/auth/reset-password", { token, password });
  return response.data;
};

// ─── Stripe Payment API Functions ─────────────────────────────────────────
export const createCheckoutSession = async () => {
  const response = await api.post("/payments/create-checkout-session");
  return response.data;
};

// Round 5 (#3): Stripe checkout for booking a trip (one-time payment).
// Backend pre-creates a Pending Booking row, returns the Stripe URL we
// redirect the user to. On payment success the webhook flips the booking
// to Paid; PaymentSuccess page then routes to /booking/:id/confirmed.
export const createTripCheckout = async (tripId) => {
  const response = await api.post("/payments/create-trip-checkout", { tripId });
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await api.get("/payments/subscription-status");
  return response.data;
};

export const cancelSubscription = async () => {
  const response = await api.post("/payments/cancel-subscription");
  return response.data;
};

export default api;