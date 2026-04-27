// src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { getSubscriptionStatus } from "../api/client";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    const refreshUserStatus = async () => {
      try {
        // Wait a few seconds for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
  }, [searchParams, navigate]);

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
          <p style={{ color: C.offWhite }}>Confirming your payment...</p>
        </div>
      </div>
    );
  }

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
          Your Pro subscription is now active. You have unlimited access to all Pro features.
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
        </div>
      </div>
    </div>
  );
}