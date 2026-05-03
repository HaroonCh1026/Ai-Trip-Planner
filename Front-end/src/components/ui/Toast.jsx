import { useEffect } from "react";
import { C } from "../../styles/colors";

/**
 * Toast — replaces native alert() in admin pages.
 *
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   ...
 *   setToast({ kind: "error", message: "Save failed." });
 *   ...
 *   <Toast toast={toast} onClose={() => setToast(null)} />
 *
 * Auto-dismisses after 4s. `kind` controls color: "success" | "error" | "info".
 * Renders inline (not a portal) so positioning is handled by `fixed` styling.
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => onClose?.(), 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  // Color/icon mapping by kind. Falls back to info-style for unknown kinds.
  const palette =
    toast.kind === "success"
      ? { bg: "rgba(50,180,50,0.12)", border: "rgba(92,204,92,0.4)", text: "#5CCC5C", icon: "✓" }
      : toast.kind === "error"
      ? { bg: "rgba(255,128,128,0.10)", border: "rgba(255,128,128,0.4)", text: "#FF8080", icon: "⚠" }
      : { bg: "rgba(168,119,212,0.10)", border: "rgba(168,119,212,0.4)", text: "#A877D4", icon: "ℹ" };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        minWidth: 280,
        maxWidth: 420,
        padding: "12px 16px",
        background: "#1a1a1a",
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "toast-slide-in 0.25s ease-out",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span
        style={{
          color: palette.text,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {palette.icon}
      </span>
      <div style={{ flex: 1, fontSize: 13, color: C.offWhite, lineHeight: 1.5 }}>
        {toast.message}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{
          background: "transparent",
          border: "none",
          color: C.midGray,
          fontSize: 18,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.offWhite; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.midGray; }}
      >
        ×
      </button>
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}