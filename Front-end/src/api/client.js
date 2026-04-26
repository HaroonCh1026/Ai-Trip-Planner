import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 60000, // 60s — slightly higher than backend Gemini timeout (45s) so the server can return a clean error first
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
// (this means the token is expired/revoked mid-session and we need to bounce
// the user back to log in again).
//
// IMPORTANT: don't redirect when the 401 came from the login or register
// endpoint itself — those are expected failures (wrong password, lockout)
// and the AuthPage component handles the error message inline.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/social");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    // 423 Locked is always returned to the caller for inline display.
    return Promise.reject(error);
  }
);

export default api;
