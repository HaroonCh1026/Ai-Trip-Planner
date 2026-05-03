import { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import { tripService } from "../../services/tripService";

// ─── Category metadata ─────────────────────────────────────────────────────
// Each tip from the backend carries a `category` string. We map it here to
// a display label, an emoji icon, and an accent color used for the left
// border of the tip card. Backend may add new categories later; unrecognised
// ones fall back to the generic "tip" entry.
const CATEGORY_META = {
  hidden_gem: { label: "Hidden Gem",       icon: "💎", accent: "#A877D4" },
  food:       { label: "Food",             icon: "🍛", accent: "#E08A2C" },
  culture:    { label: "Culture",          icon: "🕌", accent: "#5BA8A0" },
  safety:     { label: "Safety",           icon: "🛡️", accent: "#D4624A" },
  photo:      { label: "Photo Spot",       icon: "📸", accent: "#6E91D4" },
  transport:  { label: "Transport",        icon: "🚌", accent: "#8C3232" },
  shopping:   { label: "Shopping",         icon: "🛍️", accent: "#C9A02E" },
  tip:        { label: "Insider Tip",      icon: "✨", accent: "#A8A8A8" },
};

const getMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.tip;

// ─── Panel ─────────────────────────────────────────────────────────────────
// Pro-gated panel that surfaces AI-generated local insider tips for the
// destination. Mirrors the design language of RefinePanel:
//   - collapsed-by-default tap target
//   - PRO badge for free users
//   - Pro gate with "Upgrade" CTA
//   - clean, no-jargon user-facing copy
//
// The interesting wrinkle: insights are CACHED on the trip after first
// generation. We auto-load any cached insights on mount (Pro users only,
// no Gemini call) so the panel can show "you've already generated insights"
// state with the tips already present. First click on the "Generate" button
// triggers the actual Gemini call; afterwards the panel just displays.
export default function InsiderTipsPanel({ trip, isPro, onUpgradeClick }) {
  const [open, setOpen] = useState(false);
  const [insights, setInsights] = useState(trip?.insiderInsights || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync local insights state when trip prop changes (e.g. after refinement
  // wipes the destination, or when navigating between trips). The cache
  // freshness check on the backend will detect stale insights.
  useEffect(() => {
    setInsights(trip?.insiderInsights || null);
  }, [trip?._id, trip?.insiderInsights]);

  const hasInsights = !!(insights && Array.isArray(insights.tips) && insights.tips.length > 0);

  // Click handler for "Generate" / "Regenerate" buttons.
  const handleLoad = async () => {
    if (!isPro) return;
    setError("");
    setLoading(true);
    try {
      const result = await tripService.getInsiderInsights(trip._id);
      setInsights(result.insights);
    } catch (err) {
      if (err.status === 403) {
        setError("Insider Insights is a Pro feature. Upgrade to unlock local tips.");
      } else {
        setError(err.message || "Could not load insights right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Collapsed state ─────────────────────────────────────────────────────
  // Same visual language as RefinePanel — single tap target with a colored
  // gradient and a subtle right-arrow affordance.
  if (!open) {
    return (
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open insider tips panel"
          style={{
            width: "100%",
            padding: "20px 24px",
            background: "linear-gradient(135deg, rgba(168,119,212,0.15), rgba(168,119,212,0.05))",
            border: "1px solid rgba(168,119,212,0.5)",
            borderRadius: 10,
            color: C.offWhite,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(168,119,212,0.22), rgba(168,119,212,0.08))")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(168,119,212,0.15), rgba(168,119,212,0.05))")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
            <span style={{ fontSize: 24 }}>💎</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                Insider Tips
                {!isPro && (
                  <span style={{ marginLeft: 10, padding: "2px 8px", background: "#FFB400", color: "#000", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                    PRO
                  </span>
                )}
                {isPro && hasInsights && (
                  <span style={{ marginLeft: 10, padding: "2px 8px", background: "rgba(95,180,140,0.2)", color: "#5FB48C", border: "1px solid #5FB48C", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
                    READY
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: C.midGray }}>
                {hasInsights
                  ? `${insights.tips.length} local insights for ${trip.destination} — hidden gems, halal food, photo spots, and more.`
                  : `Hidden gems, halal food spots, photo timing, female-traveler safety, and cultural notes for ${trip.destination}.`}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 20, color: "#A877D4" }}>→</span>
        </button>
      </div>
    );
  }

  // ── Expanded state ──────────────────────────────────────────────────────
  return (
    <div className="card" style={{ marginTop: 24, padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.offWhite, margin: 0 }}>
          💎 Insider Tips
          {!isPro && (
            <span style={{ marginLeft: 10, padding: "2px 8px", background: "#FFB400", color: "#000", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
              PRO
            </span>
          )}
        </h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close insider tips panel"
          style={{ background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <p style={{ color: C.midGray, fontSize: 13, marginBottom: 20 }}>
        Local-flavor knowledge that complements your itinerary — the kind of advice you'd get from someone who's actually been there.
      </p>

      {/* Pro gate */}
      {!isPro && (
        <div style={{ padding: "16px 18px", background: "rgba(255,180,0,0.08)", border: "1px solid #FFB400", borderRadius: 8, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FFB400", marginBottom: 4 }}>Upgrade to Pro</div>
            <div style={{ fontSize: 13, color: C.offWhite, lineHeight: 1.5 }}>
              Unlock 6–8 hand-picked local insights for every destination — hidden gems, photo timing, halal food spots, and cultural notes.
            </div>
          </div>
          <button
            onClick={onUpgradeClick}
            className="btn-primary"
            style={{ padding: "10px 18px", fontSize: 13, whiteSpace: "nowrap" }}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "rgba(212,98,74,0.1)",
            border: "1px solid #D4624A",
            borderRadius: 6,
            color: "#D4624A",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state — Pro user, no insights yet */}
      {isPro && !hasInsights && !loading && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, color: C.offWhite, marginBottom: 6 }}>
            Get insider tips for {trip.destination}
          </div>
          <div style={{ fontSize: 12, color: C.midGray, marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}>
            Our AI will generate 6–8 specific tips based on your itinerary. Takes about 10 seconds. Generated once, kept forever.
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            className="btn-primary"
            style={{ padding: "10px 24px", fontSize: 13 }}
          >
            Generate Insights
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, color: C.offWhite, marginBottom: 6 }}>
            Asking the local guide…
          </div>
          <div style={{ fontSize: 12, color: C.midGray }}>
            This takes about 10 seconds the first time. Subsequent visits will be instant.
          </div>
        </div>
      )}

      {/* Tips grid */}
      {!loading && hasInsights && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {insights.tips.map((tip, idx) => {
              const meta = getMeta(tip.category);
              return (
                <div
                  key={idx}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${meta.accent}`,
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{meta.icon}</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: meta.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        fontWeight: 700,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, marginBottom: 4, lineHeight: 1.4 }}>
                    {tip.title}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(232,232,232,0.8)", lineHeight: 1.6 }}>
                    {tip.detail}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with regenerate option + branding */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, color: C.midGray, fontStyle: "italic" }}>
              Curated for {insights.destination || trip.destination} · Powered by VoyageurAI Insights
            </div>
            <button
              onClick={handleLoad}
              disabled={loading}
              aria-label="Regenerate insider tips"
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 4,
                color: C.midGray,
                fontSize: 11,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.color = C.offWhite;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.midGray;
              }}
            >
              ↻ Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}