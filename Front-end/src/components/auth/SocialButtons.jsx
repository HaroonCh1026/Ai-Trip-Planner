import { C } from "../../styles/colors";
import { Icon } from "../Icon";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SocialButtons({ loading }) {
  const handleGoogleClick = () => {
    if (loading) return;
    window.location.href = `${BACKEND}/auth/google`;
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={handleGoogleClick}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px",
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            color: C.offWhite,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = C.crimson;
              e.currentTarget.style.background = "rgba(140,50,50,0.08)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }
          }}
        >
          <Icon.google /> Continue with Google
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}
        />
        <span style={{ color: C.midGray, fontSize: 12 }}>
          or continue with email
        </span>
        <div
          style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}
        />
      </div>
    </>
  );
}
