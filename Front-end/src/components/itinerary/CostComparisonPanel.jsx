import { C } from "../../styles/colors";

/**
 * CostComparisonPanel — user-facing cost insight on the itinerary view.
 *
 * Shows a three-column comparison (your budget / AI estimate / typical range)
 * plus a friendly verdict telling the user whether their plan looks realistic.
 *
 * IMPORTANT — this is the *consumer-facing* surface. We deliberately hide:
 *   - Model architecture (gradient boosting, etc.)
 *   - Statistical metrics (R², MAE, RMSE)
 *   - Dataset internals ("trained on 5,000 trips")
 *   - Raw delta percentages
 * Real travel platforms don't expose this machinery and we shouldn't either.
 *
 * The full technical breakdown (model performance, predicted vs actual,
 * per-region accuracy) lives in the admin analytics tab built on Day 5.
 *
 * Renders only when `trip.mlPrediction` exists. If the ML service was
 * offline at generation time, the panel is silently absent and the rest
 * of the itinerary view is unaffected.
 */
export default function CostComparisonPanel({ trip }) {
  const ml = trip?.mlPrediction;
  if (!ml) return null;

  const fmt = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

  // Verdict copy is in PRODUCT VOICE — what a helpful travel concierge would
  // say to a customer. Not "your AI estimate is X% off the regression mean."
  const label = ml.confidenceLabel || "accurate";
  const verdict = {
    accurate: {
      color: "rgb(120,220,180)",
      bg: "rgba(0,180,140,0.08)",
      border: "rgba(0,180,140,0.3)",
      icon: "✓",
      title: "Your budget looks right for this trip",
      text: "Based on similar trips across Pakistan, your planned cost is in line with what travelers typically spend.",
    },
    slightly_off: {
      color: "#FFB400",
      bg: "rgba(255,180,0,0.08)",
      border: "rgba(255,180,0,0.4)",
      icon: "⚠",
      title: "Your budget might be a little tight",
      text: "Travelers on similar trips often spend a bit more. You may want to add some buffer for unexpected costs.",
    },
    unrealistic: {
      color: "#FF6B5C",
      bg: "rgba(255,107,92,0.08)",
      border: "rgba(255,107,92,0.4)",
      icon: "⚠",
      title: "Your budget may be tight for this trip",
      text: "Travelers on similar trips have typically spent more. Consider increasing your budget or adjusting the destinations and stay.",
    },
  }[label] || {};

  const aiCost = Number(ml.aiEstimatePKR || 0);
  const budget = Number(trip?.budget || 0);

  return (
    <section
      aria-labelledby="cost-comparison-heading"
      style={{
        marginTop: 32,
        padding: "22px 24px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
      }}
    >
      {/* Header — branded, no technical detail */}
      <p
        id="cost-comparison-heading"
        className="section-label"
        style={{ margin: 0, color: C.crimson, letterSpacing: "0.15em" }}
      >
        Cost Insight
      </p>
      <h3 style={{ margin: "4px 0 18px", color: C.offWhite, fontSize: 20, fontWeight: 600 }}>
        How does this trip compare?
      </h3>

      {/* Three-column comparison grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Your budget */}
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Your Budget
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.offWhite }}>{fmt(budget)}</div>
        </div>

        {/* AI estimate — renamed for clarity */}
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Estimated Cost
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.offWhite }}>{fmt(aiCost)}</div>
        </div>

        {/* Typical range — renamed from "Travelers Like You" for shorter copy */}
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(140,50,50,0.10)",
            border: `1px solid ${C.crimson}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 10, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontWeight: 600 }}>
            Typical Range
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.offWhite }}>
            {fmt(ml.lowPKR)} – {fmt(ml.highPKR)}
          </div>
          <div style={{ fontSize: 11, color: C.midGray, marginTop: 2 }}>
            for similar trips
          </div>
        </div>
      </div>

      {/* Verdict bar — friendly, actionable, no jargon */}
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: "12px 16px",
          background: verdict.bg,
          border: `1px solid ${verdict.border}`,
          borderRadius: 6,
          color: C.offWhite,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 18, color: verdict.color, flexShrink: 0, lineHeight: 1.2 }}>
            {verdict.icon}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: verdict.color, marginBottom: 2 }}>
              {verdict.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(232,232,232,0.85)" }}>
              {verdict.text}
            </div>
          </div>
        </div>
      </div>

      {/* Round 1 fix: when AI's original cost was scaled to match ML's range,
          surface this transparently. Users see why the bookable price aligns
          with the typical range. Hidden when no reconciliation happened. */}
      {ml.costReconciled && ml.originalAiCostPKR > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(168,119,212,0.06)",
            border: "1px solid rgba(168,119,212,0.25)",
            borderRadius: 6,
            fontSize: 12,
            color: "rgba(232,232,232,0.85)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#A877D4" }}>ℹ Cost reconciled.</strong>{" "}
          Initial AI estimate of {fmt(ml.originalAiCostPKR)} fell outside the typical range for similar trips, so we adjusted to align with the ML model's expected cost. This keeps the bookable price consistent with what travellers actually spend.
        </div>
      )}

      {/* Subtle branded sign-off — no technical machinery */}
      <div style={{ fontSize: 11, color: C.midGray, marginTop: 12, lineHeight: 1.5, textAlign: "right" }}>
        Powered by VoyageurAI Insights
      </div>
    </section>
  );
}