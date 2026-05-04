// src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { getSubscriptionStatus } from "../api/client";
import { bookingService } from "../services/bookingService";

/**
 * PaymentSuccess — landing page after a successful Stripe Checkout.
 *
 * Round 5 (#3): now handles two flows distinguished by ?type:
 *   • type=subscription (or absent, for legacy)  → Pro upgrade verification
 *                                                   then redirects to dashboard
 *   • type=booking (with bookingId)              → trip booking verification
 *                                                   then routes to /booking/:id/confirmed
 *
 * The webhook handles the actual database mutation. This page just polls
 * for that mutation to be visible and then redirects appropriately.
 */
export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Round 5 (#3): branch by ?type query param.
  const flowType = searchParams.get("type") || "subscription";
  const bookingIdParam = searchParams.get("bookingId");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    // ── Booking flow ────────────────────────────────────────────────────
    if (flowType === "booking" && bookingIdParam) {
      const verifyBooking = async () => {
        try {
          // Webhook may take 1-3s to process. Poll the booking status up
          // to 5 times with 1.5s gaps before giving up.
          let booking = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise((r) => setTimeout(r, 1500));
            try {
              booking = await bookingService.getBookingById(bookingIdParam);
              if (booking?.status === "Paid") break;
            } catch (e) {
              // 404 / network blip — keep retrying
              console.warn(`[PaymentSuccess] poll attempt ${attempt + 1} failed:`, e.message);
            }
          }

          if (booking?.status === "Paid") {
            navigate(`/booking/${bookingIdParam}/confirmed`, { replace: true });
            return;
          }

          // Stripe accepted the payment but our webhook hasn't flipped the
          // row yet (or we couldn't fetch). Send the user to the receipt
          // page anyway — it'll show the latest status; if still Pending
          // it'll just say so. Better than leaving them stuck on this page.
          setError(
            booking
              ? "We're still confirming your booking. The receipt page will update shortly."
              : "Could not verify your booking right now, but your payment went through. Check your bookings list."
          );
          setLoading(false);
        } catch (err) {
          console.error("[PaymentSuccess] booking verification failed:", err);
          setError(
            "Could not verify booking status. Your payment went through; please check your email or your bookings list."
          );
          setLoading(false);
        }
      };
      verifyBooking();
      return;
    }

    // ── Subscription flow (existing behavior, preserved) ───────────────
    const refreshUserStatus = async () => {
      try {
        // Wait a few seconds for webhook to process
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const response = await getSubscriptionStatus();
        if (response.success && response.data.plan === "pro") {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            user.plan = "pro";
            localStorage.setItem("user", JSON.stringify(user));
          }
        }
      } catch (err) {
        console.error("Failed to get subscription status:", err);
        setError("Could not verify payment status. Please check your email or contact support.");
      } finally {
        setLoading(false);
      }
    };

    refreshUserStatus();
  }, [searchParams, navigate, flowType, bookingIdParam]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse 70% 70% at 50% 50%, rgba(140,50,50,0.1) 0%, ${C.nearBlack} 70%)`,
        }}
      >
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: `3px solid ${C.crimson}`,
              borderTop: `3px solid transparent`,
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: C.offWhite }}>
            {flowType === "booking" ? "Confirming your booking..." : "Confirming your payment..."}
          </p>
        </div>
      </div>
    );
  }

  // Booking flow with error: show inline message + link to bookings.
  // Subscription flow with error: existing behavior.
  const isBooking = flowType === "booking";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse 70% 70% at 50% 50%, rgba(140,50,50,0.1) 0%, ${C.nearBlack} 70%)`,
        padding: "20px",
      }}
    >
      <div className="card" style={{ padding: "40px", textAlign: "center", maxWidth: 500 }}>
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(50,180,50,0.15)",
            border: `2px solid #5CCC5C`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Icon.check style={{ width: 36, height: 36, stroke: "#5CCC5C", strokeWidth: 2.5 }} />
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          Payment Successful! 🎉
        </h1>
        <p style={{ color: C.midGray, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          {isBooking
            ? "Your trip booking has been processed. Loading your receipt..."
            : "Your Pro subscription is now active. You have unlimited access to all Pro features."}
        </p>
        {error && (
          <div
            style={{
              background: "rgba(220,50,50,0.1)",
              border: `1px solid ${C.crimson}`,
              borderRadius: 8,
              padding: "12px",
              marginBottom: 24,
              fontSize: 13,
              color: "#FF8080",
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          {isBooking ? (
            <>
              <button
                className="btn-primary"
                onClick={() =>
                  bookingIdParam
                    ? navigate(`/booking/${bookingIdParam}/confirmed`)
                    : navigate("/dashboard")
                }
                style={{ flex: 1 }}
              >
                View Receipt
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate("/dashboard")}
                style={{ flex: 1 }}
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-primary"
                onClick={() => navigate("/dashboard")}
                style={{ flex: 1 }}
              >
                Go to Dashboard
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate("/profile")}
                style={{ flex: 1 }}
              >
                View Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}