import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { bookingService } from "../../services/bookingService";

/**
 * BookTripButton — "Book This Trip" CTA shown on the itinerary view.
 *
 * Day 4 simulation: the booking is fake (no real partner integration), but
 * the flow demonstrates the platform's revenue model. We show the fee
 * transparently BEFORE booking — service fee is 8% of the trip's totalCost,
 * displayed alongside the breakdown so the user can see exactly what they're
 * agreeing to.
 *
 * Flow:
 *   1. Click "Book This Trip" → button expands into a confirmation card
 *      showing baseAmount + 8% serviceFee = finalAmount
 *   2. Click "Confirm Booking" → POST /api/bookings/trip → on success,
 *      navigate to /booking/:id/confirmed
 *   3. Errors shown inline with retry button
 *
 * The two-step (preview, then confirm) is intentional — we never want a
 * single misclick to create a paid booking. Same reason real travel
 * platforms make you click through 2-3 confirmation screens.
 */
export default function BookTripButton({ trip }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("idle");   // 'idle' | 'preview' | 'submitting' | 'error'
  const [error, setError] = useState("");

  const baseAmount = Number(trip?.totalCost || 0);
  const serviceFee = Math.round(baseAmount * 0.08);
  const finalAmount = baseAmount + serviceFee;

  const fmt = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

  // Defensive: don't show button if the trip has no cost (newly created stubs)
  if (baseAmount <= 0 || !trip?._id) return null;

  const startPreview = () => {
    setError("");
    setPhase("preview");
  };

  const cancelPreview = () => {
    setPhase("idle");
    setError("");
  };

  const submitBooking = async () => {
    setError("");
    setPhase("submitting");
    try {
      const booking = await bookingService.bookTrip(trip._id);
      // Navigate to the confirmation page — booking._id is what the receipt
      // route uses to fetch the booking back.
      navigate(`/booking/${booking._id}/confirmed`);
    } catch (err) {
      console.error("Trip booking failed:", err);
      setError(err.message || "Booking failed. Please try again.");
      setPhase("error");
    }
  };

  // ── Render: idle (just the CTA button) ──────────────────────────────────
  if (phase === "idle") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={startPreview}
          aria-label="Book this trip"
          className="btn-primary"
          style={{
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon.sparkle /> Book This Trip
        </button>
      </div>
    );
  }

  // ── Render: preview (transparent breakdown + confirm/cancel) ───────────
  return (
    <section
      role="region"
      aria-labelledby="booking-preview-heading"
      style={{
        marginTop: 24,
        padding: "22px 24px",
        background: "rgba(140,50,50,0.06)",
        border: `1px solid ${C.crimson}`,
        borderRadius: 10,
      }}
    >
      <p
        id="booking-preview-heading"
        className="section-label"
        style={{ margin: 0, color: C.crimson, letterSpacing: "0.15em" }}
      >
        Booking Summary
      </p>
      <h3 style={{ margin: "4px 0 18px", color: C.offWhite, fontSize: 20, fontWeight: 600 }}>
        Confirm your booking
      </h3>

      {/* Cost breakdown */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 14, color: "rgba(232,232,232,0.85)" }}>Trip total</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, fontFamily: "'DM Mono', monospace" }}>
            {fmt(baseAmount)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 14, color: "rgba(232,232,232,0.85)" }}>
            Service fee (8%)
            <span style={{ display: "block", fontSize: 11, color: C.midGray, marginTop: 2 }}>
              Helps run the platform — secure your booking, customer support
            </span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, fontFamily: "'DM Mono', monospace" }}>
            {fmt(serviceFee)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", borderTop: `2px solid ${C.crimson}`, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Total payable
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.crimson, fontFamily: "'DM Mono', monospace" }}>
            {fmt(finalAmount)}
          </span>
        </div>
      </div>

      {/* Error (if any) */}
      {error && (
        <div role="alert" style={{ padding: "10px 12px", background: "rgba(255,107,92,0.08)", border: "1px solid rgba(255,107,92,0.4)", borderRadius: 6, color: "#FF6B5C", fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          onClick={cancelPreview}
          disabled={phase === "submitting"}
          aria-label="Cancel booking"
          style={{
            padding: "12px 18px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            color: C.midGray,
            cursor: phase === "submitting" ? "not-allowed" : "pointer",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          onClick={submitBooking}
          disabled={phase === "submitting"}
          aria-label="Confirm booking"
          className="btn-primary"
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: phase === "submitting" ? "wait" : "pointer",
            opacity: phase === "submitting" ? 0.7 : 1,
          }}
        >
          {phase === "submitting" ? "Confirming…" : "Confirm Booking"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.midGray, marginTop: 14, lineHeight: 1.5 }}>
        This is a simulated booking for demo purposes. No payment will be charged.
      </div>
    </section>
  );
}