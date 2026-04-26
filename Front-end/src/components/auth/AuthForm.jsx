import { C } from "../../styles/colors";

export default function AuthForm({ mode, form, setForm, error, loading, onSubmit, onToggle }) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {mode === "signup" && (
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
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Ahmed Khan"
            />
          </div>
        )}
        <div>
          <label
            style={{
              fontSize: 13,
              color: C.midGray,
              marginBottom: 6,
              display: "block",
            }}
          >
            Email Address *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            placeholder="you@example.com"
          />
        </div>
        {mode === "signup" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: C.midGray,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Phone (optional)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+92 300 0000000"
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
                City (optional)
              </label>
              <input
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Lahore"
              />
            </div>
          </div>
        )}
        <div>
          <label
            style={{
              fontSize: 13,
              color: C.midGray,
              marginBottom: 6,
              display: "block",
            }}
          >
            Password *
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="Minimum 6 characters"
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
        </div>
      </div>

      {error && (() => {
        // Detect lockout-style messages so we can show a slightly more
        // prominent treatment with a lock icon. Anything else is rendered
        // as a regular auth error.
        const lower = error.toLowerCase();
        const isLockout = lower.includes("locked") || lower.includes("lockout");
        return (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: "12px 16px",
              background: isLockout ? "rgba(255,180,0,0.10)" : "rgba(140,50,50,0.15)",
              border: `1px solid ${isLockout ? "#FFB400" : C.crimson}`,
              borderRadius: 6,
              fontSize: 13,
              color: isLockout ? "#FFB400" : "#FF8080",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{isLockout ? "🔒" : "⚠️"}</span>
            <span>{error}</span>
          </div>
        );
      })()}

      <button
        className="btn-primary"
        style={{
          width: "100%",
          justifyContent: "center",
          marginTop: 24,
          padding: "14px",
        }}
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                display: "inline-block",
              }}
            />
            {mode === "login" ? "Signing in..." : "Creating account..."}
          </span>
        ) : mode === "login" ? (
          "Sign In"
        ) : (
          "Create Account"
        )}
      </button>

      {mode === "login" && (
        <p
          style={{
            textAlign: "center",
            marginTop: 12,
            fontSize: 12,
            color: C.midGray,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.target.style.color = C.crimson)}
          onMouseLeave={(e) => (e.target.style.color = C.midGray)}
        >
          Forgot your password?
        </p>
      )}

      <p
        style={{
          textAlign: "center",
          marginTop: 16,
          fontSize: 14,
          color: C.midGray,
        }}
      >
        {mode === "login"
          ? "Don't have an account? "
          : "Already have an account? "}
        <span
          style={{ color: C.crimson, cursor: "pointer", fontWeight: 500 }}
          onClick={onToggle}
        >
          {mode === "login" ? "Sign up free" : "Sign in"}
        </span>
      </p>
    </>
  );
}