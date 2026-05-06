import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { DESTINATIONS } from "../constants/data";
import TripCard from "../components/TripCard";
import ProfilePage from "./ProfilePage";
import api, { createCheckoutSession } from "../api/client";
import ConfirmModal from "../components/ui/ConfirmModal";

const VALID_TABS = ["trips", "explore", "history", "profile"];

export default function Dashboard({
  user,
  trips: initialTrips,
  appConfig,
  onCreateTrip,
  onViewTrip,
  onLogout,
  onNavigate,
  onUserUpdate,
  onTripStatusUpdate,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlTab = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(urlTab) ? urlTab : "trips";
  const setActiveTab = (next) => {
    if (next === "trips") {
      // keep URL clean for the default tab
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ tab: next }, { replace: false });
    }
    // UI Round 1: close mobile drawer when a tab is picked
    setMobileMenuOpen(false);
  };
  const [trips, setTrips] = useState(initialTrips || []);
  const [loading, setLoading] = useState(false);
  // Day 6: replace window.confirm() with styled modal
  const [confirm, setConfirm] = useState(null);
  // Round 5b: paid bookings shown in the History tab.
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  // UI Round 1: mobile drawer toggle (presentation-only state).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  // Day 6: free trip limit comes from /auth/me (admin-editable in Pricing
  // Controls). Falls back to 5 if appConfig hasn't loaded yet.
  const FREE_LIMIT = appConfig?.freeTripLimit ?? 5;
  const tripsUsed = user?.tripsUsed || 0;
  const freeLeft = Math.max(0, FREE_LIMIT - tripsUsed);
  const isLimitHit = user?.plan === "free" && tripsUsed >= FREE_LIMIT;
  const isPro = user?.plan === "pro";

  useEffect(() => {
    if (initialTrips && initialTrips.length > 0) {
      setTrips(initialTrips);
      return;
    }
    if (!user.isAdmin) {
      setLoading(true);
      api
        .get("/trips")
        .then(({ data }) => setTrips(data.data.trips))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [initialTrips, user.isAdmin]);

  // Round 5b: load user's bookings for the History tab. Filtered client-side
  // to Paid trip bookings only (subscription bookings are admin-financial,
  // not user-relevant). Cheap fetch — runs once on Dashboard mount.
  useEffect(() => {
    if (user.isAdmin) return;
    setBookingsLoading(true);
    api
      .get("/bookings")
      .then(({ data }) => {
        setBookings(data?.data?.bookings || []);
      })
      .catch((err) => {
        console.error("Failed to load bookings:", err);
        // Non-fatal — History tab just won't show the bookings section.
      })
      .finally(() => setBookingsLoading(false));
  }, [user.isAdmin]);

  // Round 5b: derive paid trip bookings.
  // Filters out: pending bookings (incomplete checkouts), cancelled/declined,
  // and subscription bookings (those are user's Pro upgrades, not trip
  // purchases — they show up in Plan & Billing instead).
  const paidBookings = bookings.filter(
    (b) => b.status === "Paid" && b.bookingType === "trip"
  );

  const upcomingTrips = trips.filter(
    (t) => !t.status || t.status === "upcoming",
  );
  const completedTrips = trips.filter((t) => t.status === "completed");
  const cancelledTrips = trips.filter((t) => t.status === "cancelled");

  const handleMarkComplete = async (tripId) => {
    try {
      await api.patch(`/trips/${tripId}/status`, { status: "completed" });
      setTrips((p) =>
        p.map((t) => (t._id === tripId ? { ...t, status: "completed" } : t)),
      );
      if (onTripStatusUpdate) onTripStatusUpdate(tripId, "completed");
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkCancelled = (tripId) => {
    setConfirm({
      title: "Mark this trip as cancelled?",
      message: "You can re-create it later from your trip history. The itinerary will be preserved.",
      confirmLabel: "Cancel trip",
      destructive: true,
      onConfirm: async () => {
        try {
          await api.patch(`/trips/${tripId}/status`, { status: "cancelled" });
          setTrips((p) =>
            p.map((t) => (t._id === tripId ? { ...t, status: "cancelled" } : t)),
          );
          if (onTripStatusUpdate) onTripStatusUpdate(tripId, "cancelled");
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // Round 5b: Direct-to-Stripe upgrade from Dashboard.
  // Replaces the old "navigate to /profile and let user click Upgrade there"
  // flow. Calls /payments/create-checkout-session and redirects to Stripe
  // immediately — same one-click flow the ProfilePage UpgradeModal uses
  // after the user clicks Confirm.
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const handleUpgradeClick = async () => {
    setUpgrading(true);
    setUpgradeError("");
    try {
      const response = await createCheckoutSession();
      if (response.success && response.data?.url) {
        // Leave the SPA — Stripe will redirect us back to /payment/success
        window.location.href = response.data.url;
        return;
      }
      throw new Error(response.message || "Could not start checkout");
    } catch (err) {
      console.error("Upgrade error:", err);
      setUpgradeError(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong starting checkout. Please try again."
      );
      setUpgrading(false);
    }
    // Note: on success we redirect, so no need to setUpgrading(false) there.
  };

  const tabs = [
    { id: "explore", icon: <Icon.sparkle />, label: "Explore" },
    { id: "trips", icon: <Icon.map />, label: "My Trips" },
    { id: "history", icon: <Icon.history />, label: "History" },
    { id: "profile", icon: <Icon.user />, label: "Profile" },
  ];

  // ─── UI Round 1: small render helpers ─────────────────────────────────
  // These are pure presentation — they read the same `tabs` array and the
  // same handler functions. No state shape changes.

  const renderNavTab = (tab, opts = {}) => {
    const active = activeTab === tab.id;
    const fullWidth = opts.fullWidth;
    return (
      <button
        key={tab.id}
        className="vai-nav-tab vai-focusable"
        onClick={() => setActiveTab(tab.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: fullWidth ? "12px 16px" : "8px 14px",
          borderRadius: 6,
          background: active ? "rgba(140,50,50,0.2)" : "transparent",
          border: "none",
          color: active ? C.crimsonLight : C.midGray,
          cursor: "pointer",
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: active ? 600 : 500,
          width: fullWidth ? "100%" : undefined,
          justifyContent: fullWidth ? "flex-start" : "center",
        }}
      >
        {tab.icon} <span>{tab.label}</span>
      </button>
    );
  };

  // Stat card with a subtle decorative icon — same data, just presented
  // with more visual identity per card.
  const StatCard = ({ label, value, highlight, pro, icon }) => {
    const accent = highlight ? C.crimsonLight : pro ? "#5CCC5C" : C.offWhite;
    const border = highlight
      ? C.crimson
      : pro
        ? "rgba(92,204,92,0.45)"
        : "rgba(255,255,255,0.06)";
    return (
      <div
        className="vai-card-lift"
        style={{
          background: C.darkGray,
          borderRadius: 10,
          border: `1px solid ${border}`,
          padding: "20px 22px",
          position: "relative",
          overflow: "hidden",
          minHeight: 92,
        }}
      >
        {icon && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              opacity: 0.3,
              color: accent,
              display: "flex",
            }}
          >
            {icon}
          </div>
        )}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            color: accent,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.midGray,
            marginTop: 6,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <>
    <div style={{ minHeight: "100vh", background: C.nearBlack }}>
      {/* ── Top Nav ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(13,13,13,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid rgba(140,50,50,0.2)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(16px, 5vw, 48px)",
          height: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: C.crimson,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon.plane />
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Voyageur<span style={{ color: C.crimson }}>AI</span>
          </span>
        </div>

        {/* Desktop nav cluster */}
        <div className="vai-desktop-only" style={{ gap: 4, alignItems: "center" }}>
          {tabs.map((tab) => renderNavTab(tab))}
          <div
            aria-hidden
            style={{
              width: 1,
              height: 22,
              background: "rgba(255,255,255,0.08)",
              margin: "0 6px",
            }}
          />
          <button
            className="vai-nav-tab vai-focusable"
            onClick={() => onNavigate("support")}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Support
          </button>
          {user.isAdmin && (
            <button
              className="vai-focusable"
              onClick={() => onNavigate("admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                background: "rgba(224,92,92,0.15)",
                border: `1px solid ${C.crimson}`,
                color: C.crimsonLight,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Icon.shield width="16" height="16" /> Admin Panel
            </button>
          )}
          <button
            className="vai-nav-tab vai-focusable"
            onClick={onLogout}
            style={{
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger (only visible <=768px) */}
        <button
          className="vai-mobile-only vai-focusable"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: C.offWhite,
            width: 40,
            height: 40,
            borderRadius: 8,
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mobileMenuOpen ? <Icon.close /> : <Icon.menu />}
        </button>
      </nav>

      {/* Mobile drawer — appears under nav when hamburger is open */}
      {mobileMenuOpen && (
        <div
          className="vai-mobile-only vai-drawer"
          style={{
            position: "sticky",
            top: 64,
            zIndex: 49,
            flexDirection: "column",
            gap: 4,
            padding: "12px clamp(16px, 5vw, 48px)",
            background: "rgba(13,13,13,0.98)",
            borderBottom: "1px solid rgba(140,50,50,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {tabs.map((tab) => renderNavTab(tab, { fullWidth: true }))}
          <div
            aria-hidden
            style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "6px 0" }}
          />
          <button
            className="vai-focusable"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate("support");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "left",
              width: "100%",
            }}
          >
            Support
          </button>
          {user.isAdmin && (
            <button
              className="vai-focusable"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("admin");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 6,
                background: "rgba(224,92,92,0.15)",
                border: `1px solid ${C.crimson}`,
                color: C.crimsonLight,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                textAlign: "left",
                width: "100%",
              }}
            >
              <Icon.shield width="16" height="16" /> Admin Panel
            </button>
          )}
          <button
            className="vai-focusable"
            onClick={() => {
              setMobileMenuOpen(false);
              onLogout();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "left",
              width: "100%",
            }}
          >
            Logout
          </button>
        </div>
      )}

      {/* ── Main ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "clamp(28px, 5vw, 48px) clamp(16px, 5vw, 48px)",
        }}
      >
        {/* Stats */}
        <div
          className="vai-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 14,
            marginBottom: 40,
          }}
        >
          <StatCard
            label="Total Trips"
            value={trips.length}
            icon={<Icon.map width="22" height="22" />}
          />
          <StatCard
            label="Upcoming"
            value={upcomingTrips.length}
            icon={<Icon.calendar width="22" height="22" />}
          />
          <StatCard
            label="Completed"
            value={completedTrips.length}
            icon={<Icon.check width="22" height="22" />}
          />
          {isPro ? (
            <StatCard
              label="Plan"
              value="Pro ∞"
              pro
              icon={<Icon.crown width="22" height="22" />}
            />
          ) : (
            <StatCard
              label="Free Trips Left"
              value={Math.max(0, freeLeft)}
              highlight={isLimitHit}
              icon={<Icon.sparkle width="22" height="22" />}
            />
          )}
        </div>

        {/* ── MY TRIPS TAB ── */}
        {activeTab === "trips" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p className="section-label" style={{ marginBottom: 6 }}>
                  Your itineraries
                </p>
                <h2
                  className="display-heading"
                  style={{ fontSize: 24, lineHeight: 1.15 }}
                >
                  My Trips
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Round 5b (#7a updated): direct-to-Stripe upgrade.
                    Bypasses the previous "navigate to profile then click again"
                    UX. Calls /payments/create-checkout-session and redirects
                    to Stripe immediately. Falls back to in-card error message
                    on failure (e.g., Stripe not configured).
                    UI Round 1: replaced loud yellow gradient with a calmer
                    gold ghost button (.vai-pro-ghost) so it doesn't fight
                    the primary "Plan New Trip" CTA. */}
                {!isPro && !isLimitHit && (
                  <button
                    className="vai-pro-ghost vai-focusable"
                    onClick={handleUpgradeClick}
                    disabled={upgrading}
                    title="Get unlimited AI itineraries — PKR 2,500/month"
                  >
                    <Icon.crown />
                    {upgrading ? "Redirecting…" : "Upgrade to Pro"}
                  </button>
                )}
                <button
                  className="btn-primary vai-focusable"
                  onClick={isLimitHit ? undefined : onCreateTrip}
                  disabled={isLimitHit}
                  title={isLimitHit ? "Upgrade to Pro" : ""}
                  style={{
                    opacity: isLimitHit ? 0.5 : 1,
                    cursor: isLimitHit ? "not-allowed" : "pointer",
                  }}
                >
                  <Icon.plus /> Plan New Trip
                </button>
              </div>
            </div>
            {/* Round 5b: surface direct-Stripe upgrade errors inline.
                Auto-clears when the user tries again successfully. */}
            {upgradeError && (
              <div
                role="alert"
                style={{
                  padding: "12px 18px",
                  background: "rgba(255,107,92,0.08)",
                  border: "1px solid rgba(255,107,92,0.4)",
                  borderRadius: 8,
                  color: "#FF6B5C",
                  fontSize: 13,
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>⚠ {upgradeError}</span>
                <button
                  className="vai-focusable"
                  onClick={() => setUpgradeError("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FF6B5C",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 0,
                  }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
            {isLimitHit && (
              <div
                style={{
                  padding: "20px 24px",
                  background: "rgba(140,50,50,0.1)",
                  border: `1.5px solid ${C.crimson}`,
                  borderRadius: 10,
                  marginBottom: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Icon.crown />
                    <span style={{ fontWeight: 600 }}>Free limit reached</span>
                  </div>
                  <p style={{ color: C.midGray, fontSize: 13 }}>
                    You've used all {FREE_LIMIT} free itineraries. Upgrade to
                    Pro for unlimited planning.
                  </p>
                </div>
                <button
                  className="btn-primary vai-focusable"
                  onClick={handleUpgradeClick}
                  disabled={upgrading}
                  style={{
                    cursor: upgrading ? "wait" : "pointer",
                    opacity: upgrading ? 0.6 : 1,
                  }}
                >
                  <Icon.crown />
                  {upgrading ? "Redirecting…" : "Upgrade to Pro"}
                </button>
              </div>
            )}
            {!isLimitHit && !isPro && freeLeft <= 2 && freeLeft > 0 && (
              <div
                style={{
                  padding: "14px 18px",
                  background: "rgba(140,50,50,0.08)",
                  border: "1px solid rgba(140,50,50,0.3)",
                  borderRadius: 8,
                  marginBottom: 24,
                  fontSize: 13,
                }}
              >
                ⚠️{" "}
                <strong style={{ color: C.crimsonLight }}>
                  {freeLeft} free {freeLeft !== 1 ? "itineraries" : "itinerary"}
                </strong>{" "}
                remaining.
              </div>
            )}
            {loading ? (
              <div
                style={{ textAlign: "center", padding: 48, color: C.midGray }}
              >
                Loading trips...
              </div>
            ) : trips.length === 0 ? (
              <div
                className="card"
                style={{ padding: "60px 32px", textAlign: "center" }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 22,
                    marginBottom: 8,
                  }}
                >
                  No trips yet
                </h3>
                <p style={{ color: C.midGray, fontSize: 14, marginBottom: 24 }}>
                  Create your first AI-powered travel itinerary
                </p>
                <button
                  className="btn-primary vai-focusable"
                  onClick={onCreateTrip}
                >
                  <Icon.plus /> Plan Your First Trip
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 20,
                }}
              >
                {trips.map((trip) => (
                  <TripCard
                    key={trip._id}
                    trip={trip}
                    onClick={() => onViewTrip(trip)}
                    onMarkComplete={() => handleMarkComplete(trip._id)}
                    onMarkCancelled={() => handleMarkCancelled(trip._id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EXPLORE TAB ── */}
        {activeTab === "explore" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p className="section-label">Popular Destinations</p>
              <h2
                className="display-heading"
                style={{ fontSize: 24, marginBottom: 8, lineHeight: 1.15 }}
              >
                Explore Pakistan
              </h2>
              <p style={{ color: C.midGray, fontSize: 14 }}>
                Click a destination to start planning your trip
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: 16,
              }}
            >
              {DESTINATIONS.map((dest) => (
                <div
                  key={dest.name}
                  className="vai-trip-card vai-card-lift"
                  style={{
                    cursor: isLimitHit ? "not-allowed" : "pointer",
                    overflow: "hidden",
                    borderRadius: 10,
                    background: C.darkGray,
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: isLimitHit ? 0.6 : 1,
                  }}
                  onClick={isLimitHit ? undefined : onCreateTrip}
                >
                  <div
                    style={{
                      height: 140,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={dest.img}
                      alt={dest.name}
                      onError={(e) => {
                        e.target.src =
                          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg";
                      }}
                      className="vai-trip-img"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: 14,
                        right: 14,
                        color: "white",
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {dest.name}
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <p
                      style={{
                        fontSize: 12,
                        color: C.midGray,
                        lineHeight: 1.5,
                      }}
                    >
                      {dest.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB — distinct design (Issue 6) ── */}
        {activeTab === "history" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p className="section-label">Your Journey</p>
              <h2
                className="display-heading"
                style={{ fontSize: 24, marginBottom: 8, lineHeight: 1.15 }}
              >
                Trip History
              </h2>
              <p style={{ color: C.midGray, fontSize: 14 }}>
                Your paid bookings, completed adventures, and cancelled trips — all in one place
              </p>
            </div>

            {/* Round 5b: Paid Bookings section.
                Distinct emerald accent so paid bookings stand out from the
                completed/cancelled trip-status sections below. Each row links
                to /booking/:id/confirmed for the receipt. */}
            {bookingsLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: C.midGray,
                  fontSize: 13,
                  marginBottom: 24,
                }}
              >
                Loading your bookings…
              </div>
            ) : paidBookings.length > 0 ? (
              <div style={{ marginBottom: 36 }}>
                <SectionHeading
                  dotColor="rgb(120,220,180)"
                  label={`Paid Bookings (${paidBookings.length})`}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {paidBookings.map((b) => (
                    <BookingRow key={b._id} booking={b} navigate={navigate} />
                  ))}
                </div>
              </div>
            ) : null}

            {completedTrips.length === 0 &&
            cancelledTrips.length === 0 &&
            paidBookings.length === 0 ? (
              <div
                className="card"
                style={{ padding: "60px 32px", textAlign: "center" }}
              >
                <div style={{ fontSize: 44, marginBottom: 16 }}>📖</div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 22,
                    marginBottom: 8,
                  }}
                >
                  No history yet
                </h3>
                <p style={{ color: C.midGray, fontSize: 14 }}>
                  Book a trip or mark one as completed from My Trips to see it here.
                </p>
              </div>
            ) : (
              <>
                {completedTrips.length > 0 && (
                  <>
                    <SectionHeading
                      dotColor="#5CCC5C"
                      label={`Completed (${completedTrips.length})`}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        marginBottom: 36,
                      }}
                    >
                      {completedTrips.map((trip) => (
                        <HistoryRow
                          key={trip._id}
                          trip={trip}
                          onClick={() => onViewTrip(trip)}
                          statusColor="#5CCC5C"
                        />
                      ))}
                    </div>
                  </>
                )}
                {cancelledTrips.length > 0 && (
                  <>
                    <SectionHeading
                      dotColor={C.midGray}
                      label={`Cancelled (${cancelledTrips.length})`}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {cancelledTrips.map((trip) => (
                        <HistoryRow
                          key={trip._id}
                          trip={trip}
                          onClick={() => onViewTrip(trip)}
                          statusColor={C.midGray}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <ProfilePage
            user={user}
            trips={trips}
            freeLeft={freeLeft}
            onLogout={onLogout}
            onUserUpdate={onUserUpdate}
          />
        )}
      </div>
    </div>
    <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

// UI Round 1: section heading helper. Pure presentation — replaces the
// inline-duplicated dot+label markup in the History tab. Same visual,
// same colors, just less copy-pasted JSX.
function SectionHeading({ dotColor, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: dotColor,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: dotColor,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Distinct history row card design
function HistoryRow({ trip, onClick, statusColor }) {
  return (
    <div
      onClick={onClick}
      className="vai-card-lift"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        background: C.darkGray,
        borderRadius: 10,
        border: `1px solid rgba(255,255,255,0.06)`,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={trip.image}
          alt={trip.destination}
          onError={(e) => {
            e.target.src =
              "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg";
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {trip.destination}
        </div>
        <div style={{ fontSize: 12, color: C.midGray }}>
          {trip.origin} · {trip.days} days · {trip.dates}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
            marginBottom: 4,
          }}
        >
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>
        <div
          style={{
            fontSize: 12,
            color: C.midGray,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          PKR {Number(trip.budget || 0).toLocaleString()}
        </div>
      </div>
      <Icon.arrow />
    </div>
  );
}
// ─── Round 5b: BookingRow ───────────────────────────────────────────────
// Renders a single paid booking in the History tab. Click → /booking/:id/confirmed
// (the existing receipt page). Distinct from HistoryRow (which renders trip
// status) by using emerald accents + a "PAID" pill instead of completed/cancelled.
function BookingRow({ booking, navigate }) {
  const snap = booking.tripSnapshot || {};
  const fmt = (n) =>
    `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
  const paidAmount = Number(
    booking.finalAmount || booking.amount || 0
  );
  // Booking createdAt → human date. Falls back to "—" if missing.
  const bookedOn = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString("en-PK", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div
      onClick={() => navigate(`/booking/${booking._id}/confirmed`)}
      className="vai-card-lift vai-focusable"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/booking/${booking._id}/confirmed`);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        background: C.darkGray,
        borderRadius: 10,
        border: `1px solid rgba(120,220,180,0.18)`,
        cursor: "pointer",
      }}
    >
      {/* Trip image (from snapshot, falls back to a generic Pakistan landscape) */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <img
          src={snap.image || ""}
          alt={snap.destination || "Booking"}
          onError={(e) => {
            e.target.src =
              "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg";
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 3,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17,
              fontWeight: 600,
              color: C.offWhite,
            }}
          >
            {snap.destination || "Trip"}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(120,220,180,0.15)",
              color: "rgb(120,220,180)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              border: "1px solid rgba(120,220,180,0.35)",
              lineHeight: 1.4,
            }}
          >
            Paid
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.midGray }}>
          {snap.origin || "—"}
          {" · "}
          {snap.days
            ? `${snap.days} day${snap.days === 1 ? "" : "s"}`
            : "—"}
          {snap.startDate ? ` · departs ${snap.startDate}` : ""}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.midGray,
            marginTop: 4,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {booking.bookingId || ""}
          {booking.bookingId ? " · " : ""}
          Booked {bookedOn}
        </div>
      </div>

      {/* Amount paid */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgb(120,220,180)",
            fontFamily: "'DM Mono', monospace",
            marginBottom: 2,
          }}
        >
          {fmt(paidAmount)}
        </div>
        <div style={{ fontSize: 11, color: C.midGray }}>paid</div>
      </div>

      <Icon.arrow />
    </div>
  );
}