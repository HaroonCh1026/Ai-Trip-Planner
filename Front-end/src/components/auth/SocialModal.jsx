import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function SocialModal({ 
  provider, 
  socialName, 
  setSocialName, 
  socialEmail, 
  setSocialEmail, 
  onContinue, 
  onBack, 
  error, 
  loading 
}) {
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
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: C.crimson,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon.plane />
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            Continue with {provider}
          </div>
          <p style={{ color: C.midGray, fontSize: 14, marginTop: 8 }}>
            Please provide your details to complete sign in
          </p>
        </div>
        <div className="card" style={{ padding: "32px 28px" }}>
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                background: "rgba(140,50,50,0.15)",
                border: `1px solid ${C.crimson}`,
                borderRadius: 6,
                fontSize: 13,
                color: "#FF8080",
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: C.midGray,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Full Name *
              </label>
              <input
                value={socialName}
                onChange={(e) => setSocialName(e.target.value)}
                placeholder="e.g. Ahmed Khan"
                autoFocus
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: C.midGray,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Email Address (optional)
              </label>
              <input
                type="email"
                value={socialEmail}
                onChange={(e) => setSocialEmail(e.target.value)}
                placeholder="you@gmail.com"
              />
            </div>
          </div>
          <button
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 24,
              padding: "14px",
            }}
            onClick={onContinue}
            disabled={!socialName.trim() || loading}
          >
            Continue
          </button>
          <button
            onClick={onBack}
            style={{
              width: "100%",
              marginTop: 10,
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              fontSize: 13,
              padding: "8px",
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}