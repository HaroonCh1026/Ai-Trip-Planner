import { C } from "../../styles/colors";

/**
 * FeasibilityWarnings — friendly panel surfacing timing & feasibility issues
 * the backend validator caught after Gemini generated this trip.
 *
 * Renders only when `trip.feasibility?.violations.length > 0` — the validator
 * intentionally omits the field for clean trips, so a missing field means
 * "no issues found."
 *
 * User-facing copy is deliberately gentle and helpful, never alarming. We
 * don't say "your itinerary is broken" — we say "here are some things to
 * keep in mind." That's because:
 *   1. The validator itself is sometimes overly cautious (location not in
 *      our matrix, unusual time format, etc.)
 *   2. Travelers may already be aware of long drives and have planned for them
 *   3. Confidently telling someone their itinerary is wrong, when it might
 *      not be, erodes trust in the product
 */
export default function FeasibilityWarnings({ trip }) {
  const fz = trip?.feasibility;
  const violations = fz?.violations || [];
  if (violations.length === 0) return null;

  // Group by day for cleaner display — multiple issues on the same day
  // get bundled together rather than listed separately.
  const byDay = new Map();
  for (const v of violations) {
    if (!byDay.has(v.day)) byDay.set(v.day, []);
    byDay.get(v.day).push(v);
  }

  const hasCritical = violations.some((v) => v.severity === "critical");
  const headerColor = hasCritical ? "#FF6B5C" : "#FFB400";
  const headerBg = hasCritical ? "rgba(255,107,92,0.06)" : "rgba(255,180,0,0.06)";
  const headerBorder = hasCritical ? "rgba(255,107,92,0.3)" : "rgba(255,180,0,0.3)";

  return (
    <section
      role="region"
      aria-labelledby="feasibility-heading"
      style={{
        marginTop: 24,
        padding: "20px 22px",
        background: headerBg,
        border: `1px solid ${headerBorder}`,
        borderRadius: 10,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span aria-hidden="true" style={{ fontSize: 20, color: headerColor, lineHeight: 1 }}>
          ⚠
        </span>
        <div>
          <p
            id="feasibility-heading"
            className="section-label"
            style={{ margin: 0, color: headerColor, letterSpacing: "0.15em" }}
          >
            Things to Keep in Mind
          </p>
          <h3 style={{ margin: "2px 0 0", color: C.offWhite, fontSize: 17, fontWeight: 600 }}>
            {hasCritical
              ? "A few activities may need extra travel time"
              : "Some travel time considerations"}
          </h3>
        </div>
      </div>

      {/* Day-grouped violations */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from(byDay.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([day, items]) => (
            <div
              key={day}
              style={{
                padding: "10px 14px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.crimson,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Day {day}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
                {items.map((v, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "rgba(232,232,232,0.85)",
                      lineHeight: 1.55,
                      marginBottom: i < items.length - 1 ? 6 : 0,
                      position: "relative",
                      paddingLeft: 12,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: v.severity === "critical" ? "#FF6B5C" : "#FFB400",
                      }}
                    />
                    {v.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      <div style={{ fontSize: 12, color: C.midGray, marginTop: 12, lineHeight: 1.5 }}>
        These suggestions are based on real travel times between Pakistani locations. You can still proceed with your plan — these are just things to consider.
      </div>
    </section>
  );
}