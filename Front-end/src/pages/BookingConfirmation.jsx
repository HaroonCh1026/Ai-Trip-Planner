import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { bookingService } from "../services/bookingService";

/**
 * BookingConfirmation — receipt page shown after a successful trip booking.
 *
 * Route: /booking/:id/confirmed
 *
 * Fetches the booking by id and renders a printable receipt-style page with:
 *   - bookingId (BK-90XX)
 *   - Trip snapshot (destination, dates, duration)
 *   - Cost breakdown (base + service fee + total)
 *   - Status (Paid)
 *   - "Back to my trips" CTA
 *
 * If the booking can't be loaded (wrong id, network error, not the user's
 * booking), shows a friendly error with retry link.
 */
export default function BookingConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const b = await bookingService.getBookingById(id);
        if (!cancelled) setBooking(b);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load booking.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fmt = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.nearBlack,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: C.midGray, fontSize: 14 }}>Loading booking…</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.nearBlack,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="display-heading" style={{ fontSize: 28, marginBottom: 14 }}>
            Booking not found
          </h1>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 24 }}>
            {error || "We couldn't load this booking. It may have been cancelled or the link is invalid."}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary"
            style={{ padding: "12px 24px" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const snap = booking.tripSnapshot || {};
  const baseAmount = Number(booking.baseAmount || 0);
  const serviceFee = Number(booking.serviceFee || 0);
  const finalAmount = Number(booking.finalAmount || booking.amount || 0);

  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack, padding: "40px 24px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Success header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(0,180,140,0.12)",
              border: "2px solid rgb(120,220,180)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              fontSize: 32,
              color: "rgb(120,220,180)",
            }}
            aria-hidden="true"
          >
            ✓
          </div>
          <p
            className="section-label"
            style={{ margin: 0, color: "rgb(120,220,180)", letterSpacing: "0.15em" }}
          >
            Booking Confirmed
          </p>
          <h1
            className="display-heading"
            style={{ fontSize: 28, margin: "6px 0 10px", color: C.offWhite }}
          >
            Your trip is booked
          </h1>
          <p style={{ fontSize: 13, color: C.midGray }}>
            Reference: <span style={{ color: C.offWhite, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{booking.bookingId}</span>
          </p>
        </div>

        {/* Trip snapshot card */}
        <div
          className="card"
          style={{
            padding: "24px 26px",
            marginBottom: 16,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
          }}
        >
          <p
            className="section-label"
            style={{ margin: 0, color: C.crimson, letterSpacing: "0.15em", marginBottom: 10 }}
          >
            Trip Details
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.offWhite, margin: "4px 0 6px", fontFamily: "'Playfair Display', Georgia, serif" }}>
            {snap.destination || "Your trip"}
          </h2>
          <div style={{ fontSize: 13, color: C.midGray, marginBottom: 14 }}>
            From {snap.origin || "—"} · {snap.dates || `${snap.days || "—"} days`}
            {snap.startDate && ` · departing ${snap.startDate}`}
          </div>
        </div>

        {/* Cost breakdown card */}
        <div
          className="card"
          style={{
            padding: "24px 26px",
            marginBottom: 16,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
          }}
        >
          <p
            className="section-label"
            style={{ margin: 0, color: C.crimson, letterSpacing: "0.15em", marginBottom: 14 }}
          >
            Payment Summary
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 14, color: "rgba(232,232,232,0.85)" }}>Trip total</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, fontFamily: "'DM Mono', monospace" }}>
              {fmt(baseAmount)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 14, color: "rgba(232,232,232,0.85)" }}>Service fee (8%)</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, fontFamily: "'DM Mono', monospace" }}>
              {fmt(serviceFee)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", borderTop: `2px solid ${C.crimson}`, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Total Paid
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.crimson, fontFamily: "'DM Mono', monospace" }}>
              {fmt(finalAmount)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 12px", background: "rgba(0,180,140,0.08)", border: "1px solid rgba(0,180,140,0.3)", borderRadius: 6 }}>
            <span aria-hidden="true" style={{ color: "rgb(120,220,180)" }}>✓</span>
            <span style={{ fontSize: 13, color: "rgb(120,220,180)" }}>
              Status: <strong>{booking.status || "Paid"}</strong>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary"
            style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/itinerary/${booking.tripId}`)}
            style={{
              padding: "12px 18px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: C.midGray,
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            View itinerary
          </button>
          {booking.status !== "Cancelled" && (
            <button
              onClick={() => {
                const msg =
                  `I would like to cancel my booking ${booking.bookingId}` +
                  `${snap.destination ? ` for ${snap.destination}` : ""}` +
                  ` (from ${snap.origin || "—"}, ${snap.dates || `${snap.days || "—"} days`}).` +
                  ` I've changed my plans. Please cancel this trip and process my refund of` +
                  ` PKR ${finalAmount.toLocaleString()}. Thank you.`;
                navigate(
                  `/support?tab=new&category=${encodeURIComponent("Cancellation & Refund")}` +
                  `&prefill=${encodeURIComponent(msg)}`
                );
              }}
              style={{
                padding: "12px 18px",
                background: "transparent",
                border: "1px solid rgba(140,50,50,0.5)",
                borderRadius: 6,
                color: C.crimson,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel booking
            </button>
          )}
        </div>

        <p style={{ fontSize: 11, color: C.midGray, textAlign: "center", marginTop: 24, lineHeight: 1.5 }}>
          This is a simulated booking for demo purposes. Real partner integrations are in development. <br/>
          Generated by AI Trip Planner.
        </p>
      </div>
    </div>
  );
}