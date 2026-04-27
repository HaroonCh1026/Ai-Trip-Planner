// src/App.jsx
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

import { globalStyles } from "./styles/globalStyles";
import { C } from "./styles/colors";
import { AI_CONFIG } from "./constants/config";
import { tripService } from "./services/tripService";
import api from "./api/client";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import TripCreator from "./pages/TripCreator";
import ItineraryView from "./pages/ItineraryView";
import SupportPage from "./pages/SupportPage";
import AdminPanel from "./admin/AdminPanel";
import BlogDetailPage from "./pages/BlogDetailPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import PaymentSuccess from "./pages/PaymentSuccess";  // NEW
import PaymentCancel from "./pages/PaymentCancel";    // NEW

function RequireAuth({ user, children }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
function RequireAdmin({ user, children }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Wrapper for /itinerary/:id ──
function ItineraryRoute({ activeTrip, onBack, onTripStatusUpdate }) {
  const { id } = useParams();
  const tripForView =
    activeTrip && activeTrip._id === id ? activeTrip : { _id: id };
  return (
    <ItineraryView
      trip={tripForView}
      onBack={onBack}
      onTripStatusUpdate={onTripStatusUpdate}
    />
  );
}

// ── Simple 404 page ──
function NotFoundPage({ user }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.nearBlack,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 5%",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 72,
          fontWeight: 700,
          color: C.crimson,
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          margin: 0,
        }}
      >
        Page not found
      </h1>
      <p style={{ color: C.midGray, fontSize: 15, maxWidth: 420 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        className="btn-primary"
        onClick={() =>
          navigate(user ? (user.isAdmin ? "/admin" : "/dashboard") : "/")
        }
        style={{ marginTop: 8 }}
      >
        {user ? "Back to Dashboard" : "Back to Home"}
      </button>
    </div>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [aiConfig, setAiConfig] = useState(AI_CONFIG);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("auth_token");
    const authError = params.get("auth_error");

    if (authError) {
      window.history.replaceState({}, "", "/login");
      navigate("/login");
      setBootstrapped(true);
      return;
    }
    if (authToken) {
      localStorage.setItem("token", authToken);
      api
        .get("/auth/me")
        .then(({ data }) => {
          const authUser = data?.data?.user;
          if (!authUser) throw new Error("No user returned");
          localStorage.setItem("user", JSON.stringify(authUser));
          window.history.replaceState(
            {},
            "",
            authUser.isAdmin ? "/admin" : "/dashboard",
          );
          _doLogin(authUser, false);
        })
        .catch(() => {
          localStorage.removeItem("token");
          window.history.replaceState({}, "", "/login");
          navigate("/login");
        })
        .finally(() => setBootstrapped(true));
      return;
    }

    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (stored && token) {
      const u = JSON.parse(stored);
      setUser(u);
      if (!u.isAdmin)
        tripService
          .getUserTrips()
          .then(setTrips)
          .catch(() => setTrips([]));

      api
        .get("/auth/me")
        .then(({ data }) => {
          const fresh = data?.data?.user;
          if (fresh) {
            setUser(fresh);
            localStorage.setItem("user", JSON.stringify(fresh));
          }
        })
        .catch(() => {})
        .finally(() => setBootstrapped(true));
      return;
    }
    setBootstrapped(true);
  }, []);

  const _doLogin = (userData, doNav = true) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    if (!userData.isAdmin)
      tripService
        .getUserTrips()
        .then(setTrips)
        .catch(() => setTrips([]));
    if (doNav) {
      const from = location.state?.from?.pathname;
      navigate(from || (userData.isAdmin ? "/admin" : "/dashboard"), {
        replace: true,
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTrips([]);
    setActiveTrip(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleUserUpdate = (f) =>
    setUser((p) => {
      if (!p) return p;
      const m = { ...p, ...f };
      localStorage.setItem("user", JSON.stringify(m));
      return m;
    });

  const handleCompleteTrip = (t) => {
    setUser((p) => {
      if (!p) return p;
      const u = { ...p, tripsUsed: (p.tripsUsed || 0) + 1 };
      localStorage.setItem("user", JSON.stringify(u));
      return u;
    });
    setTrips((p) => [t, ...p]);
    setActiveTrip(t);
    navigate(`/itinerary/${t._id}`);
  };

  const handleViewTrip = async (trip) => {
    if (!trip.itinerary || trip.itinerary.length === 0) {
      try {
        const full = await tripService.getTripById(trip._id);
        setActiveTrip(full);
      } catch {
        setActiveTrip(trip);
      }
    } else {
      setActiveTrip(trip);
    }
    navigate(`/itinerary/${trip._id}`);
  };

  const handleTripStatusUpdate = (tripId, status) =>
    setTrips((p) => p.map((t) => (t._id === tripId ? { ...t, status } : t)));

  if (!bootstrapped) return null;

  return (
    <>
      <style>{globalStyles}</style>
      <div className="noise-overlay" style={{ minHeight: "100vh" }}>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onLogin={() => navigate("/login")}
                onSignup={() => navigate("/signup")}
              />
            }
          />

          <Route
            path="/blog/:id"
            element={<BlogDetailPage onBack={() => navigate(-1)} />}
          />

          {/* Password Reset Routes */}
          <Route
            path="/forgot-password"
            element={
              <ForgotPasswordPage onBack={() => navigate("/login")} />
            }
          />

          <Route
            path="/reset-password/:token"
            element={
              <ResetPasswordPage onBack={() => navigate("/login")} />
            }
          />

          {/* Stripe Payment Routes (NEW - Round 8) */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} replace />
              ) : (
                <AuthPage
                  mode="login"
                  onToggle={() => navigate("/signup")}
                  onSuccess={_doLogin}
                  onBack={() => navigate("/")}
                />
              )
            }
          />

          <Route
            path="/signup"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthPage
                  mode="signup"
                  onToggle={() => navigate("/login")}
                  onSuccess={_doLogin}
                  onBack={() => navigate("/")}
                />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth user={user}>
                <Dashboard
                  user={user}
                  trips={trips}
                  onCreateTrip={() => navigate("/create")}
                  onViewTrip={handleViewTrip}
                  onLogout={handleLogout}
                  onNavigate={(v) => navigate(`/${v}`)}
                  onUserUpdate={handleUserUpdate}
                  onTripStatusUpdate={handleTripStatusUpdate}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/create"
            element={
              <RequireAuth user={user}>
                <TripCreator
                  user={user}
                  onBack={() => navigate("/dashboard")}
                  onComplete={handleCompleteTrip}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/itinerary/:id"
            element={
              <RequireAuth user={user}>
                <ItineraryRoute
                  activeTrip={activeTrip}
                  onBack={() =>
                    navigate(user?.isAdmin ? "/admin" : "/dashboard")
                  }
                  onTripStatusUpdate={handleTripStatusUpdate}
                />
              </RequireAuth>
            }
          />

          <Route
            path="/itinerary"
            element={
              <RequireAuth user={user}>
                {activeTrip ? (
                  <Navigate to={`/itinerary/${activeTrip._id}`} replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )}
              </RequireAuth>
            }
          />

          <Route
            path="/support"
            element={
              <SupportPage
                user={user}
                onBack={() => navigate(user ? "/dashboard" : "/")}
              />
            }
          />

          <Route
            path="/admin/*"
            element={
              <RequireAdmin user={user}>
                <AdminPanel
                  user={user}
                  trips={trips}
                  onLogout={handleLogout}
                  onViewTrip={handleViewTrip}
                  aiConfig={aiConfig}
                  setAiConfig={setAiConfig}
                />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<NotFoundPage user={user} />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}