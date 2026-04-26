import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function ItinerarySummary({ trip }) {
  const infoCards = [
    trip.bestTimeToVisit && {
      label: "BEST TIME TO VISIT",
      value: trip.bestTimeToVisit,
      icon: <Icon.sparkle width="16" height="16" />,
    },
    trip.currency && {
      label: "CURRENCY",
      value: trip.currency,
      icon: <Icon.dollar width="16" height="16" />,
    },
    trip.language && {
      label: "LANGUAGE",
      value: trip.language,
      icon: <Icon.activity width="16" height="16" />,
    },
  ].filter(Boolean);

  if (!trip.summary && infoCards.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        padding: "32px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {trip.summary && (
        <div className="card" style={{ padding: "24px" }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.15em",
              color: C.crimson,
              marginBottom: 8,
            }}
          >
            OVERVIEW
          </div>
          <p style={{ color: C.offWhite, fontSize: 14, lineHeight: 1.75 }}>
            {trip.summary}
          </p>
        </div>
      )}

      {infoCards.map(({ label, value, icon }) => (
        <div key={label} className="card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.15em",
              color: C.midGray,
              marginBottom: 8,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {icon} {value}
          </div>
        </div>
      ))}
    </div>
  );
}