import { C } from "../../styles/colors";

export default function DaySidebar({ days, activeDay, setActiveDay, trip }) {
  // Helper to safely get day number
  const getDayNumber = (day, index) => {
    if (day.day && typeof day.day === 'number') return day.day;
    if (day.day && typeof day.day === 'object') return day.day.number || index + 1;
    return index + 1;
  };

  // Helper to safely get day title
  const getDayTitle = (day, index) => {
    if (day.title && typeof day.title === 'string') return day.title;
    if (day.title && typeof day.title === 'object') return day.title.heading || day.title.name || `Day ${index + 1}`;
    return `Day ${index + 1}`;
  };

  // Helper to safely get daily cost
  const getDailyCost = (day) => {
    if (day.dailyCost && typeof day.dailyCost === 'number') return day.dailyCost;
    if (day.dailyCost && typeof day.dailyCost === 'object') return day.dailyCost.amount || 0;
    return 0;
  };

  // Reusable micro-label for section headers ("DAYS", "TRAVEL TIPS").
  const sectionLabel = {
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.18em",
    color: C.midGray,
    marginBottom: 14,
    textTransform: "uppercase",
  };

  return (
    <div>
      {/* ── DESKTOP: sticky vertical column ──────────────────────────────── */}
      <div
        className="vai-day-sidebar-desktop"
        style={{ position: "sticky", top: 84 }}
      >
        <div style={sectionLabel}>Days</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {days.map((day, i) => {
            const dayNum = getDayNumber(day, i);
            const dayTitle = getDayTitle(day, i);
            const dailyCost = getDailyCost(day);
            const active = activeDay === i;

            return (
              <button
                key={i}
                className="vai-focusable"
                onClick={() => setActiveDay(i)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: active ? "rgba(140,50,50,0.18)" : "transparent",
                  borderLeft: `3px solid ${active ? C.crimson : "transparent"}`,
                  textAlign: "left",
                  transition: "background 0.18s ease, border-color 0.18s ease",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: active ? C.crimsonLight : C.midGray,
                    marginBottom: 3,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  DAY {dayNum}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? C.offWhite : "rgba(242,242,242,0.7)",
                    lineHeight: 1.35,
                  }}
                >
                  {dayTitle}
                </div>
                {dailyCost > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.midGray,
                      marginTop: 4,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    PKR {dailyCost}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Overall tips */}
        {trip.tips && Array.isArray(trip.tips) && trip.tips.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>Travel Tips</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trip.tips.slice(0, 3).map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 12,
                    color: "rgba(232,232,232,0.75)",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: C.crimson, flexShrink: 0 }}>✦</span>{" "}
                  {typeof tip === "string"
                    ? tip
                    : tip.text || JSON.stringify(tip)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE: horizontal scrolling day pills ───────────────────────── */}
      <div className="vai-day-sidebar-mobile">
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Days</div>
        <div className="vai-day-pills">
          {days.map((day, i) => {
            const dayNum = getDayNumber(day, i);
            const active = activeDay === i;
            return (
              <button
                key={i}
                className="vai-day-pill vai-focusable"
                onClick={() => setActiveDay(i)}
                aria-pressed={active}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.12)"}`,
                  background: active
                    ? "rgba(140,50,50,0.22)"
                    : "rgba(255,255,255,0.03)",
                  color: active ? C.offWhite : "rgba(242,242,242,0.7)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                  transition: "all 0.18s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.08em",
                    color: active ? C.crimsonLight : C.midGray,
                    marginRight: 6,
                  }}
                >
                  D{dayNum}
                </span>
                {getDayTitle(day, i)}
              </button>
            );
          })}
        </div>

        {/* Travel tips (mobile) — kept below the pills, fully visible. */}
        {trip.tips && Array.isArray(trip.tips) && trip.tips.length > 0 && (
          <div style={{ marginTop: 20, marginBottom: 4 }}>
            <div style={{ ...sectionLabel, marginBottom: 10 }}>Travel Tips</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trip.tips.slice(0, 3).map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 12,
                    color: "rgba(232,232,232,0.75)",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: C.crimson, flexShrink: 0 }}>✦</span>{" "}
                  {typeof tip === "string"
                    ? tip
                    : tip.text || JSON.stringify(tip)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}