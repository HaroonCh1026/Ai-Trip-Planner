// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import { forgotPassword } from "../../api/client";

export default function ForgotPasswordPage({ onBack }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await forgotPassword(email);
      if (response.success) {
        setSubmitted(true);
      } else {
        setError(response.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Cannot connect to server. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
        <button
          onClick={onBack}
          style={{
            position: "fixed",
            top: 24,
            left: 24,
            background: "transparent",
            border: "none",
            color: C.midGray,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Icon.arrowLeft /> Back
        </button>

        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="card" style={{ padding: "40px 36px", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: C.crimson,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 32,
              }}
            >
              📧
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26,
                marginBottom: 12,
              }}
            >
              Check your email
            </h2>
            <p style={{ color: C.midGray, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              We've sent a password reset link to <strong>{email}</strong>
              <br />
              The link will expire in 1 hour.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/login")}
              style={{ width: "100%" }}
            >
              Back to Login
            </button>
          </div>
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
      <button
        onClick={onBack}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          background: "transparent",
          border: "none",
          color: C.midGray,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Icon.arrowLeft /> Back
      </button>

      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="card" style={{ padding: "40px 36px" }}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              marginBottom: 6,
            }}
          >
            Reset password
          </h2>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 32 }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div
              style={{
                background: "rgba(220, 50, 50, 0.1)",
                border: `1px solid ${C.crimson}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 24,
                color: C.crimson,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: C.offWhite,
                }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${error ? C.crimson : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8,
                  color: C.offWhite,
                  fontSize: 14,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? C.midGray : C.crimson,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "transparent",
                border: "none",
                color: C.crimson,
                cursor: "pointer",
                fontSize: 14,
                textDecoration: "underline",
              }}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}