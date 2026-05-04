// src/pages/PaymentCancel.jsx
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../styles/colors";

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Round 5 (#3): differentiate copy based on which flow was cancelled.
  const flowType = searchParams.get("type") || "subscription";
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
            background: "rgba(255,180,0,0.15)",
            border: `2px solid #FFB400`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <span style={{ fontSize: 32 }}>⚠️</span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          Payment Cancelled
        </h1>
        <p style={{ color: C.midGray, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          {isBooking
            ? "Your booking was not completed. No charges were made — you can return to your itinerary and try again whenever you're ready."
            : "Your payment was cancelled. No charges were made. You can continue with the Free plan or try upgrading again."}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => navigate("/dashboard")}
            style={{ flex: 1 }}
          >
            Go to Dashboard
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate(isBooking ? "/dashboard" : "/profile")}
            style={{ flex: 1 }}
          >
            {isBooking ? "Browse Trips" : "Try Again"}
          </button>
        </div>
      </div>
    </div>
  );
}