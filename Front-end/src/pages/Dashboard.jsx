import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { DESTINATIONS } from "../constants/data";
import TripCard from "../components/TripCard";
import ProfilePage from "./ProfilePage";
import api from "../api/client";

const VALID_TABS = ["trips", "explore", "history", "profile"];

export default function Dashboard({
  user,
  trips: initialTrips,
  onCreateTrip,
  onViewTrip,
  onLogout,
  onNavigate,
  onUserUpdate,
  onTripStatusUpdate,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(urlTab) ? urlTab : "trips";
  const setActiveTab = (next) => {
    if (next === "trips") {
      // keep URL clean for the default tab
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ tab: next }, { replace: false });
    }
  };
  const [trips, setTrips] = useState(initialTrips || []);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const FREE_LIMIT = 5;
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

  const handleMarkCancelled = async (tripId) => {
    if (!window.confirm("Mark this trip as cancelled?")) return;
    try {
      await api.patch(`/trips/${tripId}/status`, { status: "cancelled" });
      setTrips((p) =>
        p.map((t) => (t._id === tripId ? { ...t, status: "cancelled" } : t)),
      );
      if (onTripStatusUpdate) onTripStatusUpdate(tripId, "cancelled");
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: "explore", icon: <Icon.sparkle />, label: "Explore" },
    { id: "trips", icon: <Icon.map />, label: "My Trips" },
    { id: "history", icon: <Icon.history />, label: "History" },
    { id: "profile", icon: <Icon.user />, label: "Profile" },
  ];

  return (
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
          padding: "0 5%",
          height: 68,
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
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                background:
                  activeTab === tab.id ? "rgba(140,50,50,0.2)" : "transparent",
                border: "none",
                color: activeTab === tab.id ? C.crimson : C.midGray,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
          <button
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
            onMouseEnter={(e) => (e.currentTarget.style.color = C.offWhite)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.midGray)}
          >
            Support
          </button>
          {user.isAdmin && (
            <button
              onClick={() => onNavigate("admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                background: "rgba(224,92,92,0.15)",
                border: `1px solid ${C.crimson}`,
                color: C.crimson,
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
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8080")}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.midGray)}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 5%" }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 48,
          }}
        >
          {[
            { label: "Total Trips", value: trips.length },
            { label: "Upcoming", value: upcomingTrips.length },
            { label: "Completed", value: completedTrips.length },
            isPro
              ? { label: "Plan", value: "Pro ∞", highlight: false, pro: true }
              : {
                  label: "Free Trips Left",
                  value: Math.max(0, freeLeft),
                  highlight: isLimitHit,
                },
          ].map((s) => (
            <div
              key={s.label}
              className="card"
              style={{
                padding: "20px 24px",
                borderColor: s.highlight
                  ? C.crimson
                  : s.pro
                    ? "#5CCC5C"
                    : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  color: s.highlight
                    ? C.crimson
                    : s.pro
                      ? "#5CCC5C"
                      : C.offWhite,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: C.midGray, marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
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
              }}
            >
              <h2 className="display-heading" style={{ fontSize: 26 }}>
                My Trips
              </h2>
              <button
                className="btn-primary"
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
                  className="btn-primary"
                  onClick={() => setActiveTab("profile")}
                >
                  <Icon.crown /> Upgrade to Pro
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
                <strong style={{ color: C.crimson }}>
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
                style={{ padding: "60px 40px", textAlign: "center" }}
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
                <button className="btn-primary" onClick={onCreateTrip}>
                  <Icon.plus /> Plan Your First Trip
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
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
            <div style={{ marginBottom: 32 }}>
              <p className="section-label">Popular Destinations</p>
              <h2
                className="display-heading"
                style={{ fontSize: 26, marginBottom: 8 }}
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
                  className="card hover-lift"
                  style={{
                    cursor: "pointer",
                    overflow: "hidden",
                    borderRadius: 10,
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
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.transform = "scale(1.07)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.transform = "scale(1)")
                      }
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: 14,
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
            <div style={{ marginBottom: 32 }}>
              <p className="section-label">Your Journey</p>
              <h2
                className="display-heading"
                style={{ fontSize: 26, marginBottom: 8 }}
              >
                Trip History
              </h2>
              <p style={{ color: C.midGray, fontSize: 14 }}>
                All your completed and cancelled adventures
              </p>
            </div>
            {completedTrips.length === 0 && cancelledTrips.length === 0 ? (
              <div
                className="card"
                style={{ padding: "60px 40px", textAlign: "center" }}
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
                  Complete a trip to see it here. Mark trips as completed from
                  My Trips tab.
                </p>
              </div>
            ) : (
              <>
                {completedTrips.length > 0 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#5CCC5C",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#5CCC5C",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Completed ({completedTrips.length})
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        marginBottom: 40,
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: C.midGray,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.midGray,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Cancelled ({cancelledTrips.length})
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
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
  );
}

// Distinct history row card design
function HistoryRow({ trip, onClick, statusColor }) {
  return (
    <div
      onClick={onClick}
      className="hover-lift"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 20px",
        background: C.darkGray,
        borderRadius: 10,
        border: `1px solid rgba(255,255,255,0.06)`,
        cursor: "pointer",
        transition: "all 0.2s",
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
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: `${statusColor}20`,
            color: statusColor,
            marginBottom: 4,
          }}
        >
          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
        </span>
        <div style={{ fontSize: 12, color: C.midGray }}>
          PKR {Number(trip.budget || 0).toLocaleString()}
        </div>
      </div>
      <Icon.arrow />
    </div>
  );
}
