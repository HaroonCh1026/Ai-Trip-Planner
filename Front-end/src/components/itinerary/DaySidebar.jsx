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

  return (
    <div>
      <div style={{ position: "sticky", top: 88 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.15em",
            color: C.midGray,
            marginBottom: 16,
          }}
        >
          DAYS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {days.map((day, i) => {
            const dayNum = getDayNumber(day, i);
            const dayTitle = getDayTitle(day, i);
            const dailyCost = getDailyCost(day);
            
            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background:
                    activeDay === i
                      ? "rgba(140,50,50,0.2)"
                      : "transparent",
                  borderLeft: `3px solid ${activeDay === i ? C.crimson : "transparent"}`,
                  textAlign: "left",
                  transition: "all 0.2s",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: activeDay === i ? C.crimson : C.midGray,
                    marginBottom: 2,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  DAY {dayNum}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: activeDay === i ? C.offWhite : C.midGray,
                    lineHeight: 1.3,
                  }}
                >
                  {dayTitle}
                </div>
                {dailyCost > 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.midGray,
                      marginTop: 3,
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
            <div
              style={{
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.15em",
                color: C.midGray,
                marginBottom: 12,
              }}
            >
              TRAVEL TIPS
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {trip.tips.slice(0, 3).map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 12,
                    color: C.midGray,
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: C.crimson, flexShrink: 0 }}>✦</span>{" "}
                  {typeof tip === 'string' ? tip : tip.text || JSON.stringify(tip)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}