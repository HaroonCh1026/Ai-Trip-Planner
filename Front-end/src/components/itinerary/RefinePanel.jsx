import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { tripService } from "../../services/tripService";

// Pakistani-themed quick-tap suggestion chips. Tapping a chip pre-fills the
// input box with that text — user can then edit before sending.
const SUGGESTIONS = [
  { icon: "💰", label: "Make it cheaper",        prompt: "Suggest budget-friendly guesthouses and reduce overall cost." },
  { icon: "🕌", label: "Add prayer breaks",      prompt: "Add prayer-friendly buffers and mosque stops in the daily schedule." },
  { icon: "🍛", label: "More local food",        prompt: "Add more authentic local food spots and traditional dishes." },
  { icon: "👨‍👩‍👧", label: "Family-friendly",  prompt: "Make it more family-friendly with kid-appropriate activities." },
  { icon: "🚌", label: "Switch to bus",          prompt: "Replace flights with Daewoo or Faisal Movers buses where possible." },
];

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function RefinePanel({ trip, isPro, onTripUpdated, onUpgradeClick }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refinements = trip?.refinements || [];

  const handleSubmit = async () => {
    setError("");
    const text = instruction.trim();
    if (!text) {
      setError("Please describe what you'd like to change.");
      return;
    }
    if (text.length > 500) {
      setError("Please keep the instruction under 500 characters.");
      return;
    }
    setLoading(true);
    try {
      const updated = await tripService.refineItinerary(trip._id, text);
      setInstruction("");
      onTripUpdated(updated);
    } catch (err) {
      // 403 means non-pro user — surface a friendly upgrade prompt instead
      // of the raw API message.
      if (err.status === 403) {
        setError("Refinement is a Pro feature. Upgrade to refine your itineraries.");
      } else {
        setError(err.message || "Could not refine itinerary. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (prompt) => {
    setInstruction(prompt);
    setError("");
  };

  // Collapsed state — single tap target that expands the panel.
  if (!open) {
    return (
      <div style={{ marginTop: 40 }}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open refinement panel to tweak this itinerary"
          style={{
            width: "100%",
            padding: "20px 24px",
            background: "linear-gradient(135deg, rgba(140,50,50,0.15), rgba(140,50,50,0.05))",
            border: `1px solid ${C.crimson}`,
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(140,50,50,0.22), rgba(140,50,50,0.08))")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(140,50,50,0.15), rgba(140,50,50,0.05))")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                Refine this itinerary
                {!isPro && <span style={{ marginLeft: 10, padding: "2px 8px", background: "#FFB400", color: "#000", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>PRO</span>}
              </div>
              <div style={{ fontSize: 13, color: C.midGray }}>
                Tell our AI what to change — cheaper hotels, prayer stops, family-friendly tweaks, anything.
              </div>
            </div>
          </div>
          <span style={{ fontSize: 20, color: C.crimson }}>→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 40, padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.offWhite, margin: 0 }}>
          ✨ Refine this itinerary
          {!isPro && <span style={{ marginLeft: 10, padding: "2px 8px", background: "#FFB400", color: "#000", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>PRO</span>}
        </h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close refinement panel"
          style={{ background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <p style={{ color: C.midGray, fontSize: 13, marginBottom: 20 }}>
        Describe what you'd like to change. Our AI will rewrite the whole itinerary while keeping your destination and dates.
      </p>

      {/* Pro gate — shown if user is not pro */}
      {!isPro && (
        <div style={{ padding: "16px 18px", background: "rgba(255,180,0,0.08)", border: "1px solid #FFB400", borderRadius: 8, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FFB400", marginBottom: 4 }}>Upgrade to Pro</div>
            <div style={{ fontSize: 13, color: C.offWhite, lineHeight: 1.5 }}>
              Conversational refinement is a Pro-only feature. Pro members can iterate on their itineraries with natural-language tweaks.
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

      {/* Suggestion chips — disabled for non-pro to make the gate obvious */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => isPro && handleSuggestionClick(s.prompt)}
            disabled={!isPro || loading}
            aria-label={`Insert suggestion: ${s.label}`}
            style={{
              padding: "8px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              color: isPro ? C.offWhite : C.midGray,
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              cursor: isPro && !loading ? "pointer" : "not-allowed",
              opacity: isPro ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <textarea
          value={instruction}
          onChange={(e) => { setInstruction(e.target.value); setError(""); }}
          placeholder={isPro ? "e.g. Add Sufi shrines on day 2 and reduce hotel costs…" : "Upgrade to Pro to use refinement"}
          disabled={!isPro || loading}
          maxLength={500}
          rows={3}
          aria-label="Refinement instruction"
          style={{
            flex: 1,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            color: C.offWhite,
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            resize: "vertical",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.crimson)}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />
        <button
          onClick={handleSubmit}
          disabled={!isPro || loading || !instruction.trim()}
          className="btn-primary"
          style={{
            padding: "0 20px",
            fontSize: 13,
            whiteSpace: "nowrap",
            opacity: (!isPro || loading || !instruction.trim()) ? 0.6 : 1,
            cursor: (!isPro || loading || !instruction.trim()) ? "not-allowed" : "pointer",
          }}
          aria-label={loading ? "Refining…" : "Apply refinement"}
        >
          {loading ? "Refining…" : "Apply"}
        </button>
      </div>

      {/* Char counter (only when typing) */}
      {instruction.length > 0 && (
        <div style={{ fontSize: 11, color: C.midGray, textAlign: "right", marginTop: 6 }}>
          {instruction.length} / 500
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" style={{ marginTop: 14, padding: "10px 14px", background: "rgba(140,50,50,0.15)", border: `1px solid ${C.crimson}`, borderRadius: 6, fontSize: 13, color: "#FF8080" }}>
          {error}
        </div>
      )}

      {/* Refinement history */}
      {refinements.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            Refinement History ({refinements.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {refinements.slice().reverse().map((r, i) => (
              <div
                key={r._id || i}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: C.crimson, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Asked
                  </span>
                  <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace" }}>
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <div style={{ color: C.offWhite, lineHeight: 1.5 }}>
                  "{r.instruction}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}