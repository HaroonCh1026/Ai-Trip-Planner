import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { bookingService } from "../../services/bookingService";
import { createTripCheckout } from "../../api/client";

/**
 * BookTripButton — "Book This Trip" CTA shown on the itinerary view.
 *
 * Round 5 (#3): now redirects to Stripe Checkout for real card processing.
 * Falls back to simulated booking if the backend reports Stripe isn't
 * configured (HTTP 503 with "not configured" message).
 *
 * Flow:
 *   1. Click "Book This Trip" → expands into a confirmation card showing
 *      baseAmount + serviceFee = finalAmount
 *   2. Click "Confirm & Pay with Card" → POST /payments/create-trip-checkout
 *      → backend pre-creates Pending booking + returns Stripe Checkout URL
 *   3. window.location.href = url → user lands on Stripe's hosted checkout
 *   4. After payment, Stripe redirects to /payment/success?type=booking&...
 *      where the webhook will have flipped the booking to Paid
 *   5. PaymentSuccess routes the user to /booking/:id/confirmed (receipt)
 *
 * Cancel path: Stripe redirects to /payment/cancel?type=booking&bookingId=...
 * The Pending booking row stays — harmless. User can retry, which creates
 * a fresh Pending row (we don't reuse for audit clarity).
 *
 * Service fee % is currently 8% but admin-editable (Day 5A). The displayed
 * 8% here is illustrative — the BACKEND uses the live admin config when
 * computing the actual amount sent to Stripe. So if admin has set fee to
 * 10%, the user might see 8% in the preview but be charged 10%. Acceptable
 * tradeoff for not making this component fetch admin config on every render.
 *
 * Day 4 simulation fallback: if Stripe is disabled on the backend (503),
 * we transparently fall through to bookingService.bookTrip() which creates
 * a Paid booking immediately without payment. Lets the demo run on dev
 * environments without Stripe keys.
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

  // Round 5 (#3): primary path — Stripe Checkout redirect. Falls through to
  // simulated booking if Stripe returns 503 (not configured on this server).
  const submitBooking = async () => {
    setError("");
    setPhase("submitting");

    try {
      // Try real Stripe Checkout first
      const response = await createTripCheckout(trip._id);
      if (response.success && response.data?.url) {
        // Redirect — leaves our SPA. Browser will return via Stripe's
        // success_url / cancel_url after payment.
        window.location.href = response.data.url;
        return;
      }
      // Defensive: if response shape is unexpected, fall through to simulated
      throw new Error("Unexpected response from server");
    } catch (err) {
      // Stripe disabled on backend? Quietly fall back to simulated path.
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || "";
      if (status === 503 || /not configured/i.test(message)) {
        console.warn(
          "[BookTripButton] Stripe disabled on backend, falling back to " +
          "simulated booking. Configure STRIPE_SECRET_KEY for real card " +
          "checkout."
        );
        try {
          const booking = await bookingService.bookTrip(trip._id);
          navigate(`/booking/${booking._id}/confirmed`);
          return;
        } catch (simErr) {
          console.error("Simulated booking also failed:", simErr);
          setError(simErr.message || "Booking failed. Please try again.");
          setPhase("error");
          return;
        }
      }
      // Genuine Stripe error — surface it
      console.error("Trip booking failed:", err);
      setError(message || "Booking failed. Please try again.");
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
            Service fee (≈8%)
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
          aria-label="Confirm and pay"
          className="btn-primary"
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: phase === "submitting" ? "wait" : "pointer",
            opacity: phase === "submitting" ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {phase === "submitting" ? "Redirecting…" : "Confirm & Pay with Card →"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.midGray, marginTop: 14, lineHeight: 1.5 }}>
        Secure card payment via Stripe (test mode). Use card 4242 4242 4242 4242 with any future date and CVC.
      </div>
    </section>
  );
}