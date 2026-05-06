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

  // Shared label style — keeps the OVERVIEW / CURRENCY / etc. typography
  // consistent across all cards on this row.
  const microLabel = {
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.15em",
    marginBottom: 10,
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
        padding: "28px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {trip.summary && (
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ ...microLabel, color: C.crimson }}>OVERVIEW</div>
          <p
            style={{
              color: "rgba(242,242,242,0.92)",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            {trip.summary}
          </p>
        </div>
      )}

      {infoCards.map(({ label, value, icon }) => (
        <div key={label} className="card" style={{ padding: "20px 22px" }}>
          <div style={{ ...microLabel, color: C.midGray, marginBottom: 8 }}>
            {label}
          </div>
          <div
            style={{
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: C.offWhite,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: C.crimsonLight, display: "inline-flex" }}>
              {icon}
            </span>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}