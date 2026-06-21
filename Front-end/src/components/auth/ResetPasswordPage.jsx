// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import { resetPassword } from "../../api/client";

export default function ResetPasswordPage({ onBack }) {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token || token.length < 32) {
      setTokenValid(false);
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tokenValid) {
      setError("Invalid reset token. Please request a new password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await resetPassword(token, password);
      if (response.success) {
        setSubmitted(true);
      } else {
        setError(response.message || "Failed to reset password. Please try again.");
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

  if (!tokenValid) {
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
          }}
        >
          <Icon.arrowLeft /> Back
        </button>

        <div className="card vai-auth-card" style={{ padding: "40px 36px", textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "rgba(220, 50, 50, 0.2)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 12 }}>
            Invalid reset link
          </h2>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 24 }}>
            This password reset link is invalid or has expired.
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate("/forgot-password")}
            style={{ width: "100%" }}
          >
            Request new reset link
          </button>
        </div>
      </div>
    );
  }

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
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="card vai-auth-card" style={{ padding: "40px 36px", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "#4caf50",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Icon.check style={{ width: 32, height: 32, stroke: "white", strokeWidth: 3 }} />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26,
                marginBottom: 12,
              }}
            >
              Password reset successful!
            </h2>
            <p style={{ color: C.midGray, fontSize: 14, marginBottom: 24 }}>
              Your password has been changed. You can now log in with your new password.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/login")}
              style={{ width: "100%" }}
            >
              Go to Login
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
        }}
      >
        <Icon.arrowLeft /> Back
      </button>

      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="card vai-auth-card" style={{ padding: "40px 36px" }}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              marginBottom: 6,
            }}
          >
            Create new password
          </h2>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 32 }}>
            Enter your new password below.
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
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: C.offWhite,
                }}
              >
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${error ? C.crimson : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8,
                  color: C.offWhite,
                  fontSize: 14,
                  outline: "none",
                }}
                disabled={loading}
              />
            </div>

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
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${error ? C.crimson : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 8,
                  color: C.offWhite,
                  fontSize: 14,
                  outline: "none",
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
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}