import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function ItineraryHero({ trip, onBack }) {
  // Helper to safely get budget
  const getBudget = () => {
    if (trip.totalCost && typeof trip.totalCost === "number")
      return trip.totalCost;
    if (trip.budget && typeof trip.budget === "number") return trip.budget;
    if (trip.totalCost && typeof trip.totalCost === "object")
      return trip.totalCost.amount || 0;
    if (trip.budget && typeof trip.budget === "object")
      return trip.budget.amount || 0;
    return 0;
  };

  // Helper to safely get origin
  const getOrigin = () => {
    if (typeof trip.origin === "string") return trip.origin;
    if (trip.origin && typeof trip.origin === "object")
      return trip.origin.city || trip.origin.name || "Unknown";
    return "Unknown";
  };

  // Helper to safely get days
  const getDays = () => {
    if (typeof trip.days === "number") return trip.days;
    if (trip.days && typeof trip.days === "object")
      return trip.days.count || trip.days.days || 0;
    if (trip.itinerary && Array.isArray(trip.itinerary))
      return trip.itinerary.length;
    return 0;
  };

  // Reusable meta-row item to keep the hero markup tidy.
  const MetaItem = ({ icon, children }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        color: "rgba(242,242,242,0.85)",
      }}
    >
      {icon} {children}
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        height: "45vh",
        minHeight: 300,
        overflow: "hidden",
      }}
    >
      <img
        src={trip.image}
        alt={trip.destination}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, rgba(13,13,13,0.35) 0%, rgba(13,13,13,0.55) 50%, rgba(13,13,13,0.92) 100%)`,
        }}
      />

      {/* Back button — refined hover via .vai-hero-back, keyboard focus via .vai-focusable */}
      <button
        onClick={onBack}
        className="vai-hero-back vai-focusable"
        style={{
          position: "absolute",
          top: 20,
          left: "clamp(16px, 5vw, 48px)",
          background: "rgba(13,13,13,0.65)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 8,
          color: C.offWhite,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          transition: "background 0.18s ease, border-color 0.18s ease",
        }}
      >
        <Icon.arrowLeft /> Back
      </button>

      <div
        style={{
          position: "absolute",
          bottom: "clamp(24px, 5vw, 44px)",
          left: "clamp(16px, 5vw, 48px)",
          right: "clamp(16px, 5vw, 48px)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="section-label">AI-Generated Itinerary</div>
          <h1
            className="display-heading"
            style={{
              fontSize: "clamp(28px, 5vw, 56px)",
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            {typeof trip.destination === "string"
              ? trip.destination
              : trip.destination?.name || "Trip"}
          </h1>
          <div
            style={{
              display: "flex",
              gap: "clamp(14px, 3vw, 24px)",
              flexWrap: "wrap",
              rowGap: 10,
            }}
          >
            <MetaItem icon={<Icon.location />}>From {getOrigin()}</MetaItem>
            <MetaItem icon={<Icon.calendar />}>{getDays()} days</MetaItem>
            <MetaItem icon={<Icon.dollar />}>
              PKR {getBudget().toLocaleString()} estimated
            </MetaItem>
          </div>
        </div>
      </div>
    </div>
  );
}