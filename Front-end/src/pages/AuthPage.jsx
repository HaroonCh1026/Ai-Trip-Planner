import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import AuthHeader from "../components/auth/AuthHeader";
import SocialButtons from "../components/auth/SocialButtons";
import AuthForm from "../components/auth/AuthForm";
import api from "../api/client";

export default function AuthPage({ mode, onToggle, onSuccess, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingGoogle, setProcessingGoogle] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const userStr = params.get("user");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(
        errorParam === "auth_failed"
          ? "Google authentication failed. Please try again."
          : errorParam,
      );
      setProcessingGoogle(false);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token && userStr) {
      setProcessingGoogle(true);
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // Call onSuccess to update parent state
        if (onSuccess) {
          onSuccess(user);
        }

        // Navigate to dashboard after a short delay
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 100);
      } catch (err) {
        console.error("Failed to parse Google user data:", err);
        setError("Failed to process Google login. Please try again.");
        setProcessingGoogle(false);
      }
    }
  }, [location, navigate, onSuccess]);

  // If processing Google login, show loading
  if (processingGoogle) {
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
          <p style={{ color: C.offWhite }}>Completing Google sign in...</p>
        </div>
      </div>
    );
  }

  if (!mode) return null;

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (mode === "signup" && !form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "signup"
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
              phone: form.phone,
              city: form.city,
            }
          : { email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);
      if (data?.success && data?.data) {
        const { token, user } = data.data;
        if (!token) throw new Error("No token received from server.");
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        onSuccess(user);
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.message || "Server error. Please try again.",
        );
      } else if (err.request) {
        setError(
          "Cannot connect to server. Please check the backend is running on port 5000.",
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google auth
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    window.location.href = `${apiUrl}/auth/google`;
  };

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
        <AuthHeader />
        <div className="card" style={{ padding: "40px 36px" }}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              marginBottom: 6,
            }}
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 32 }}>
            {mode === "login"
              ? "Sign in to continue planning"
              : "Join Pakistan's premier AI travel platform"}
          </p>

          {/* Google OAuth button with custom handler */}
          <SocialButtons loading={loading} onGoogleClick={handleGoogleLogin} />

          <AuthForm
            mode={mode}
            form={form}
            setForm={setForm}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
            onToggle={onToggle}
          />
        </div>
      </div>
    </div>
  );
}
